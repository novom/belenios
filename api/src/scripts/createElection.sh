#!/bin/bash

belenios-tool () {
  _build/install/default/bin/belenios-tool "$@"
}

UUID=`belenios-tool generate-token`
mkdir elections/$UUID
echo -n $UUID
