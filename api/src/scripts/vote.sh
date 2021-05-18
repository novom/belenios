#!/bin/bash

belenios-tool () {
  _build/install/default/bin/belenios-tool "$@"
}

PRIVCRED=$1
BALLOT=$2
BALLOT_FILE_PATH=$3
PRIVCRED_FILE_PATH=$4
DIR=$5

belenios-tool vote --privcred <(echo "$PRIVCRED") --ballot <(echo "$BALLOT") --dir "$DIR" > "$BALLOT_FILE_PATH"
belenios-tool compute-voters --dir $DIR --privcred $PRIVCRED_FILE_PATH
