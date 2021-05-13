#!/bin/bash

belenios-tool () {
  _build/install/default/bin/belenios-tool "$@"
}

UUID=$1
FILE=$2
DIR=$3

belenios-tool credgen --uuid $UUID --group files/groups/default.json --file $FILE --dir $DIR
mv $DIR/*.pubcreds $DIR/public_creds.txt
mv $DIR/*.privcreds $DIR/private_creds.txt
belenios-tool trustee-keygen --group files/groups/default.json
mv *.pubkey $DIR/public_keys.jsons
mv *.privkey $DIR/private_keys.jsons
belenios-tool mktrustees --dir $DIR
rm -f $DIR/public_keys.jsons
