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

module type PARAMS = sig
  module G : GROUP
end

module Run (P : PARAMS) : EMPTY = struct
  open P

  (* Setup group *)

  module M = Election.MakeSimpleMonad(G);;

  (* Generate key *)

  module KG = Election.MakeSimpleDistKeyGen(G)(M);;
  let private_key, public_key = KG.generate_and_prove () ();;
  assert (KG.check public_key);;

  (* Save to file *)

  let id = String.sub
    (sha256_hex (G.to_string public_key.trustee_public_key))
    0 8 |> String.uppercase
  ;;

  Printf.printf "Keypair %s has been generated\n%!" id;;

  let pubkey =
    "public",
    id ^ ".pubkey",
    0o444,
    public_key,
    write_trustee_public_key G.write

  let privkey =
    "private",
    id ^ ".privkey",
    0o400,
    private_key,
    write_number

  let save (kind, filename, perm, thing, writer) =
    let oc = open_out_gen [Open_wronly; Open_creat] perm filename in
    let ob = Bi_outbuf.create_channel_writer oc in
    writer ob thing;
    Bi_outbuf.add_char ob '\n';
    Bi_outbuf.flush_channel_writer ob;
    close_out oc;
    Printf.printf "%s key saved to %s\n%!" (String.capitalize kind) filename;
    (* set permissions in the unlikely case where the file already existed *)
    Unix.chmod filename perm;;

  save pubkey;;
  save privkey;;

end

open Tool_common

let main group =
  wrap_main (fun () ->
    let _, group = get_mandatory_opt "--group" group in
    let module P = struct module G = (val group : GROUP) end in
    let module X : EMPTY = Run (P) in ()
  )

open Cmdliner

let tkeygen_cmd =
  let doc = "generate a trustee key" in
  let man = [
    `S "DESCRIPTION";
    `P "This command is run by a trustee to generate a share of an election key. Such a share consists of a private key and a public key with a certificate. Generated files are stored in the current directory with a name that starts with $(i,ID), where $(i,ID) is a short fingerprint of the public key. The private key is stored in $(i,ID.privkey) and must be secured by the trustee. The public key is stored in $(i,ID.pubkey) and must be sent to the election administrator.";
  ] @ common_man in
  Term.(ret (pure main $ group_t)),
  Term.info "trustee-keygen" ~doc ~man

let cmds = [tkeygen_cmd]
