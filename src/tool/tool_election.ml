(**************************************************************************)
(*                                BELENIOS                                *)
(*                                                                        *)
(*  Copyright © 2012-2014 Inria                                           *)
(*                                                                        *)
(*  This program is free software: you can redistribute it and/or modify  *)
(*  it under the terms of the GNU Affero General Public License as        *)
(*  published by the Free Software Foundation, either version 3 of the    *)
(*  License, or (at your option) any later version, with the additional   *)
(*  exemption that compiling, linking, and/or using OpenSSL is allowed.   *)
(*                                                                        *)
(*  This program is distributed in the hope that it will be useful, but   *)
(*  WITHOUT ANY WARRANTY; without even the implied warranty of            *)
(*  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU     *)
(*  Affero General Public License for more details.                       *)
(*                                                                        *)
(*  You should have received a copy of the GNU Affero General Public      *)
(*  License along with this program.  If not, see                         *)
(*  <http://www.gnu.org/licenses/>.                                       *)
(**************************************************************************)

open Serializable_builtin_j
open Serializable_j
open Signatures
open Common

(* Helpers *)

let ( / ) = Filename.concat

let load_from_file of_string filename =
  if Sys.file_exists filename then (
    Printf.eprintf "Loading %s...\n%!" filename;
    let ic = open_in filename in
    let lines =
      let rec loop lines =
        match (try Some (input_line ic) with End_of_file -> None) with
        | Some "" -> loop lines
        | Some line -> loop (of_string line::lines)
        | None -> lines
      in loop []
    in
    close_in ic;
    Some (List.rev lines)
  ) else None


module type PARAMS = sig
  val dir : string
  val sk_file : string option
  val do_finalize : bool
  val do_decrypt : bool
  val ballot_file : string option
  include ELECTION_PARAMS
end

module Run (P : PARAMS) : EMPTY = struct

  open P
  module M = Election.MakeSimpleMonad(G)
  module E = Election.MakeElection(G)(M);;

  (* Load and check trustee keys, if present *)

  module KG = Election.MakeSimpleDistKeyGen(G)(M);;

  let public_keys_with_pok =
    load_from_file (
      trustee_public_key_of_string G.read
    ) (dir/"public_keys.jsons") |> option_map Array.of_list

  let () =
    match public_keys_with_pok with
    | Some pks ->
      assert (Array.forall KG.check pks);
      let y' = KG.combine pks in
      assert G.(params.e_public_key =~ y')
    | None -> ()

  let public_keys =
    option_map (
      Array.map (fun pk -> pk.trustee_public_key)
    ) public_keys_with_pok

  (* Finish setting up the election *)

  let pks = match public_keys with
    | Some pks -> pks
    | None -> failwith "missing public keys"

  let e = {
    e_params = params;
    e_pks = Some pks;
    e_fingerprint = fingerprint;
  }

  (* Load ballots, if present *)

  module GSet = Set.Make (G)

  let public_creds =
    load_from_file G.of_string (dir/"public_creds.txt") |>
    option_map (fun xs ->
      List.fold_left (fun accu x ->
        GSet.add x accu
      ) GSet.empty xs
    )

  let ballots =
    load_from_file (fun line ->
      ballot_of_string G.read line,
      sha256_b64 line
    ) (dir/"ballots.jsons")

  let check_signature_present =
    match public_creds with
    | Some creds -> (fun b ->
      match b.signature with
      | Some s -> GSet.mem s.s_public_key creds
      | None -> false
    )
    | None -> (fun _ -> true)

  let vote (b, hash) =
    if check_signature_present b && E.check_ballot e b
    then M.cast b ()
    else Printf.ksprintf failwith "ballot %s failed tests" hash

  let () = ballots |> option_map (List.iter vote) |> ignore

  let encrypted_tally = lazy (
    match ballots with
      | None -> failwith "ballots.jsons is missing"
      | Some _ ->
        M.fold (fun () b t ->
          M.return (E.combine_ciphertexts (E.extract_ciphertext b) t)
        ) (E.neutral_ciphertext e) ()
  )

  let () = match ballot_file with
    | None -> ()
    | Some fn ->
      (match load_from_file plaintext_of_string fn with
      | Some [b] ->
        let sk =
          match sk_file with
          | Some fn ->
            (match load_from_file (fun x -> x) fn with
            | Some [cred] ->
              let hex = Tool_credgen.derive e.e_params.e_uuid cred in
              Some Z.(of_string_base 16 hex mod G.q)
            | _ -> failwith "invalid credential file"
            )
          | None -> None
        in
        let b = E.create_ballot e ?sk (E.make_randomness e ()) b () in
        assert (E.check_ballot e b);
        print_endline (string_of_ballot G.write b)
      | _ -> failwith "invalid plaintext ballot file"
      )

  let () = if do_decrypt then
    match sk_file with
    | Some fn ->
      (match load_from_file (number_of_string) fn with
        | Some [sk] ->
          let pk = G.(g **~ sk) in
          if Array.forall (fun x -> not G.(x =~ pk)) pks then (
            Printf.eprintf "Warning: your key is not present in public_keys.jsons!\n";
          );
          let tally = Lazy.force encrypted_tally in
          let factor =
            E.compute_factor tally sk ()
          in
          assert (E.check_factor tally pk factor);
          print_endline (string_of_partial_decryption G.write factor)
        | _ -> failwith "invalid private key file"
      )
    | None -> ()

  (* Load or compute result, and check it *)

  let result =
    load_from_file (
      result_of_string G.read
    ) (dir/"result.json")

  let () =
    match result with
    | Some [result] ->
      assert (E.check_result e result)
    | Some _ ->
      failwith "invalid result file"
    | None ->
      let factors = load_from_file (
        partial_decryption_of_string G.read
      ) (dir/"partial_decryptions.jsons") |> option_map Array.of_list in
      match factors with
      | Some factors ->
        let tally = Lazy.force encrypted_tally in
        assert (Array.forall2 (E.check_factor tally) pks factors);
        let result = E.combine_factors (M.cardinal ()) tally factors in
        assert (E.check_result e result);
        if do_finalize then (
          save_to (dir/"result.json") (
            write_result G.write
          ) result;
          Printf.eprintf "result.json written\n%!"
        );
      | None -> ()

  (* The end *)

  let () = Printf.eprintf "All checks passed!\n%!"

end

open Tool_common

type action = Vote | Verify | Decrypt | Finalize

let main action dir privkey ballot =
  wrap_main (fun () ->
    let fname = dir/"election.json" in
    let params =
      load_from_file Group.election_params_of_string fname |>
      function
      | Some [e] -> e
      | None -> failcmd "could not read %s" fname
      | _ -> Printf.ksprintf failwith "invalid election file: %s" fname
    in
    let module P : PARAMS = struct
      let dir = dir
      let sk_file = privkey
      let ballot_file = ballot
      let do_decrypt = action = Decrypt
      let do_finalize = action = Finalize
      include (val params : ELECTION_PARAMS)
    end in
    let module X : EMPTY = Run (P) in ()
  )

open Cmdliner

let dir_t =
  let doc = "Path to election files." in
  let the_info = Arg.info ["dir"] ~docv:"DIR" ~doc in
  Arg.(value & opt dir Filename.current_dir_name the_info)

let privcred_t =
  let doc = "Read private credential from file $(docv)." in
  let the_info = Arg.info ["privcred"] ~docv:"PRIV_CRED" ~doc in
  Arg.(value & opt (some file) None the_info)

let privkey_t =
  let doc = "Read private key from file $(docv)." in
  let the_info = Arg.info ["privkey"] ~docv:"PRIV_KEY" ~doc in
  Arg.(value & opt (some file) None the_info)

let ballot_t =
  let doc = "Read ballot choices from file $(docv)." in
  let the_info = Arg.info ["ballot"] ~docv:"BALLOT" ~doc in
  Arg.(value & opt (some file) None the_info)

let vote_cmd =
  let doc = "create a ballot" in
  let man = [
    `S "DESCRIPTION";
    `P "This command creates a ballot and prints it on standard output.";
  ] @ common_man in
  Term.(ret (pure main $ pure Vote $ dir_t $ privcred_t $ ballot_t)),
  Term.info "vote" ~doc ~man

let verify_cmd =
  let doc = "verify election data" in
  let man = [
    `S "DESCRIPTION";
    `P "This command performs all possible verifications.";
  ] @ common_man in
  Term.(ret (pure main $ pure Verify $ dir_t $ privkey_t $ ballot_t)),
  Term.info "verify" ~doc ~man

let decrypt_cmd =
  let doc = "perform partial decryption" in
  let man = [
    `S "DESCRIPTION";
    `P "This command is run by each trustee to perform a partial decryption.";
  ] @ common_man in
  Term.(ret (pure main $ pure Decrypt $ dir_t $ privkey_t $ ballot_t)),
  Term.info "decrypt" ~doc ~man

let finalize_cmd =
  let doc = "finalizes an election" in
  let man = [
    `S "DESCRIPTION";
    `P "This command reads partial decryptions done by trustees from file $(i,partial_decryptions.jsons), checks them, combines them into the final tally and prints the result to standard output.";
    `P "The result structure contains partial decryptions itself, so $(i,partial_decryptions.jsons) can be discarded afterwards.";
  ] @ common_man in
  Term.(ret (pure main $ pure Finalize $ dir_t $ privkey_t $ ballot_t)),
  Term.info "finalize" ~doc ~man

let cmds = [vote_cmd; verify_cmd; decrypt_cmd; finalize_cmd]
