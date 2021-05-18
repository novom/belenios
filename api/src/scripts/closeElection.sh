#!/bin/bash

belenios-tool () {
  _build/install/default/bin/belenios-tool "$@"
}

PRIV_KEYS_FILE_PATH=$1
PARTIAL_DECRYPTION_FILE_PATH=$2
RESULT_FILE_PATH=$3
DIR=$4
TEMP_FILE=$DIR/partial_decryptions.tmp

for u in $(cat $PRIV_KEYS_FILE_PATH); do
    belenios-tool decrypt --privkey <(echo "$u") --dir $DIR
    echo >&2
done > $TEMP_FILE
mv $TEMP_FILE $PARTIAL_DECRYPTION_FILE_PATH

belenios-tool validate --dir $DIR

cat $RESULT_FILE_PATH
