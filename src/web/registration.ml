open Util
open Serializable_t
open Lwt

(* FIXME: the following should be in configuration file... but
   <maxrequestbodysize> doesn't work *)
let () = Ocsigen_config.set_maxrequestbodysizeinmemory 128000

module EMap = Map.Make(Uuidm)

let ( / ) = Filename.concat

let file_exists x =
  try_lwt
    Lwt_unix.(access x [R_OK]) >>
    return true
  with _ ->
    return false

let populate accu f s = Lwt_stream.fold_s f s accu

lwt election_table =
  let dir = ref None in
  let open Ocsigen_extensions.Configuration in
  Eliom_config.parse_config [
    element
      ~name:"data"
      ~obligatory:false
      ~attributes:[
        attribute ~name:"dir" ~obligatory:true (fun s -> dir := Some s);
      ]
      ()
  ];
  match !dir with
    | Some dir ->
      Ocsigen_messages.debug (fun () ->
        "Using data from " ^ dir ^ "..."
      );
      Lwt_unix.files_of_directory dir |>
      populate EMap.empty (fun subdir accu ->
        let path = dir/subdir in
        lwt b = file_exists (path/"result.json") in
        if b then (
          (* result is available *)
          (* TODO: if the election is featured, show it on the home page *)
          return accu
        ) else (
          let fn_election = path/"election.json" in
          let fn_public_keys = path/"public_keys.jsons" in
          lwt b = file_exists fn_election in
          if b then (
            Ocsigen_messages.debug (fun () ->
              "-- registering " ^ subdir
            );
            lwt raw =
              Lwt_io.chars_of_file fn_election |>
              Lwt_stream.to_string
            in
            let election = Serializable_j.election_of_string
              Serializable_j.read_ff_pubkey raw
            in
            let fingerprint = sha256_b64 raw in
            let election_data = Web_common.({
              fn_election;
              fingerprint;
              election;
              fn_public_keys;
              featured_p = true;
              can_read = Any;
              can_vote = Any;
            }) in
            let {g; p; q; y} = election.e_public_key in
            let module G = (val
              Election.finite_field ~p ~q ~g :
                Signatures.GROUP with type t = Z.t
            ) in
            let module P = struct
              module G = G
              let public_keys = lazy (assert false)
              let params = { election with e_public_key = y }
              let fingerprint = fingerprint
            end in
            let module X : Web_common.WEB_ELECTION = struct
              module G = G
              module M = Web_common.MakeLwtRandom(G)
              module E = Election.MakeElection(P)(M)
              module B = Web_common.MakeBallotBox(E)
              let data = election_data
            end in
            let uuid = election.e_uuid in
            return (EMap.add uuid (module X : Web_common.WEB_ELECTION) accu)
          ) else return accu
        )
       )
    | None -> return EMap.empty

let get_election_by_uuid x =
  try_lwt
    EMap.find x election_table |> return
  with Not_found ->
    raise_lwt Eliom_common.Eliom_404

let get_featured_elections () =
  EMap.fold (fun uuid e res ->
    let module X = (val e : Web_common.WEB_ELECTION) in
    let e = X.data in
    if e.Web_common.featured_p then e::res else res
  ) election_table [] |> return

let fail_http status =
  raise_lwt (
    Ocsigen_extensions.Ocsigen_http_error
      (Ocsigen_cookies.empty_cookieset, status)
  )

let forbidden () = fail_http 403

let if_eligible acl f uuid x =
  lwt election = get_election_by_uuid uuid in
  let module X = (val election : Web_common.WEB_ELECTION) in
  lwt user = Eliom_reference.get Services.user in
  lwt () =
    let open Web_common in
    match acl X.data with
      | Any -> return ()
      | Restricted p ->
        match user with
          | Some user ->
            lwt ok = p user in
            if ok then return () else forbidden ()
        | None -> forbidden ()
  in f uuid election user x

let () = Eliom_registration.Html5.register
  ~service:Services.home
  (fun () () ->
    Eliom_reference.unset Services.saved_service >>
    lwt featured = get_featured_elections () in
    Templates.index ~featured)

let () = Eliom_registration.Html5.register
  ~service:Services.login_dummy
  (fun () () ->
    let service = Services.create_dummy_login () in
    let () = Eliom_registration.Redirection.register
      ~service
      ~scope:Eliom_common.default_session_scope
      (fun () user_name ->
        let open Web_common in
        let user_type = Dummy in
        Eliom_reference.set Services.user (Some {user_name; user_type}) >>
        Services.get ())
    in
    Templates.dummy_login ~service)

let next_lf str i =
  try Some (String.index_from str i '\n')
  with Not_found -> None

let () = Eliom_registration.Redirection.register
  ~service:Services.login_cas
  (fun ticket () -> match ticket with
    | Some x ->
      let me =
        let service = Eliom_service.preapply Services.login_cas None in
        Eliom_uri.make_string_uri ~absolute:true ~service ()
      in
      let validation =
        let service = Eliom_service.preapply Services.cas_validate (me, x) in
        Eliom_uri.make_string_uri ~absolute:true ~service ()
      in
      lwt reply = Ocsigen_http_client.get_url validation in
      (match reply.Ocsigen_http_frame.frame_content with
        | Some stream ->
          lwt info = Ocsigen_stream.(string_of_stream 1000 (get stream)) in
          Ocsigen_stream.finalize stream `Success >>
          (match next_lf info 0 with
            | Some i ->
              (match String.sub info 0 i with
                | "yes" ->
                  (match next_lf info (i+1) with
                    | Some j ->
                      let open Web_common in
                      let user_name = String.sub info (i+1) (j-i-1) in
                      let user_type = CAS in
                      Eliom_reference.set Services.user
                        (Some {user_name; user_type}) >>
                      Services.get ()
                    | None -> fail_http 502
                  )
                | "no" -> fail_http 401
                | _ -> fail_http 502
              )
            | None -> fail_http 502
          )
        | None -> fail_http 502
      )
    | None ->
      let service = Eliom_service.preapply Services.login_cas None in
      let uri = Eliom_uri.make_string_uri ~absolute:true ~service () in
      return (Eliom_service.preapply Services.cas_login uri)
  )

let () = Eliom_registration.Redirection.register
  ~service:Services.logout
  (fun () () ->
    lwt user = Eliom_reference.get Services.user in
    Eliom_reference.unset Services.user >>
    match user with
      | Some user when user.Web_common.user_type = Web_common.CAS ->
        lwt service = Services.get () in
        let uri = Eliom_uri.make_string_uri ~absolute:true ~service () in
        return (Eliom_service.preapply Services.cas_logout uri)
      | _ -> Services.get ()
  )

let can_read x = x.Web_common.can_read
let can_vote x = x.Web_common.can_vote

let () = Eliom_registration.File.register
  ~service:Services.election_raw
  ~content_type:"application/json"
  (if_eligible can_read
     (fun uuid election user () ->
       let module X = (val election : Web_common.WEB_ELECTION) in
       return X.data.Web_common.fn_election
     )
  )

let () = Eliom_registration.File.register
  ~service:Services.election_public_keys
  ~content_type:"application/json"
  (if_eligible can_read
      (fun uuid election user () ->
        let module X = (val election : Web_common.WEB_ELECTION) in
        return X.data.Web_common.fn_public_keys
      )
   )

let () = Eliom_registration.String.register
  ~service:Services.election_ballots
  (if_eligible can_read
     (fun uuid election user () ->
       let uuid_underscored = String.map (function '-' -> '_' | c -> c) (Uuidm.to_string uuid) in
       let table = Ocsipersist.open_table ("ballots_" ^ uuid_underscored) in
       lwt ballots = Ocsipersist.fold_step (fun hash v res ->
         let s = Serializable_j.string_of_ballot Serializable_builtin_j.write_number v ^ "\n" in
         return (s :: res)
       ) table [] in
       let result = String.concat "" ballots in
       return (result, "application/json")
     )
  )

let prng = Cryptokit.Random.(pseudo_rng (string secure_rng 16))

let () = Eliom_registration.String.register
  ~service:Services.get_randomness
  (fun () () ->
    Cryptokit.Random.(string prng 32) |>
    Cryptokit.(transform_string (Base64.encode_compact ())) |>
    (fun x -> Serializable_j.string_of_randomness { randomness=x }) |>
    (fun x -> return (x, "application/json"))
  )

let () = Eliom_registration.Html5.register
  ~service:Services.election_index
  (if_eligible can_read
     (fun uuid election user () ->
       let module X = (val election : Web_common.WEB_ELECTION) in
       Templates.election_view ~election:X.data ~user
     )
  )

let () = Eliom_registration.Redirection.register
  ~service:Services.election_vote
  (if_eligible can_vote
     (fun uuid election user () ->
       return (Services.make_booth uuid)
     )
  )

let () = Eliom_registration.Redirection.register
  ~service:Services.election_cast
  (if_eligible can_vote
     (fun uuid election user () ->
       let module X = (val election : Web_common.WEB_ELECTION) in
       return (
         Services.(preapply_uuid election_index X.data)
       )
     )
  )

let () = Eliom_registration.Html5.register
  ~service:Services.election_cast_post
  (if_eligible can_vote
     (fun uuid election user raw_ballot ->
       let module X = (val election : Web_common.WEB_ELECTION) in
       let result =
         try
           let ballot = Serializable_j.ballot_of_string Serializable_builtin_j.read_number raw_ballot in
           if
             Uuidm.equal uuid ballot.election_uuid &&
             X.E.check_ballot ballot
           then `Valid (sha256_b64 raw_ballot)
           else `Invalid
         with e -> `Malformed e
       in
       Templates.cast_ballot ~election:X.data ~result
     )
  )
