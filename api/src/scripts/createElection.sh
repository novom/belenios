#!/bin/bash

belenios-tool () {
  _build/install/default/bin/belenios-tool "$@"
}

UUID=`belenios-tool generate-token`
echo -n $UUID
