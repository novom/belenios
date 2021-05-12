#!/bin/bash

belenios-tool () {
  _build/install/default/bin/belenios-tool "$@"
}

belenios-tool mkelection --uuid $UUID --group files/groups/novom.json --template tests/tool/templates/questions.json --dir $DIR