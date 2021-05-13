#!/bin/bash

belenios-tool () {
  _run/tool-debug/bin/belenios-tool "$@"
}
#APP: SUPERADMIN qui active la feature AGA

#API: Create election || ADMIN
UUID=`belenios-tool generate-token`
DIR=tests/tool/data/$UUID
mkdir $DIR
mkdir $DIR/temp
echo "UUID of the election is $UUID" #Sends this to the admin
#THIS CREATES A NEW NAMESPACE
#APP SAVE ELECTION UUID IN DATA-BACKEND

#API: Create voter list || ADMIN || N times 
# If called multiple times, overwrite whatever was in voters.txt before
> $DIR/voters.txt
echo 'UserId,1000' >> $DIR/voters.txt
echo 'voter2,2000' >> $DIR/voters.txt
#APP SAVE ELECTION LIST IN DATA-BACKEND
#ALLOW IMPORT CSV

#API: Get voter list (Sanity check that the server contains the expected voters list)

#API: Lock voters list (CAN ONLY BE DONE ONCE) || ADMIN
#Once this is called, block the create voter list action from being called.
#Also create the trustee file on the server
#In the future, we might handle multiple trustees and other stuff but for now, the server is the trustee
belenios-tool credgen --uuid $UUID --group files/groups/novom.json --file $DIR/voters.txt --dir $DIR
mv $DIR/*.pubcreds $DIR/public_creds.txt
mv $DIR/*.privcreds $DIR/private_creds.txt
belenios-tool trustee-keygen --group files/groups/novom.json
mv *.pubkey $DIR/public_keys.jsons
mv *.privkey $DIR/private_keys.jsons
belenios-tool mktrustees --dir $DIR
rm -f $DIR/public_keys.jsons
#APP: CAN ONLY BE DONE IF LIST HAS BEEN VERIFIED

#API: Create questions (CAN BE REPEATED) || ADMIN
#This already overwrites the election.json file.
belenios-tool mkelection --uuid $UUID --group files/groups/novom.json --template tests/tool/templates/questions.json --dir $DIR
#APP: QUESTION EDITOR ()

#API: Open election || Allow connections other than admin

###
  #Need conferenceId
  #ask me if private_creds.txt exissts
  #yes -> send to RT OPEN_ELECTION ( UUID )

###
#Do not allow if there is not private_creds, private_keys, public_creds, trustees, election, voters
#API: On user connect with valid JWT (is USERID in jwt ?) -> respond with value in private_creds.txt with the userID
#APP: Socket.io Client

#API: Vote || USER
echo "Private cred:"
read privcred
echo "USERID"
read userID
if grep "$userID" "$DIR"/private_creds.txt | grep "$privcred" ; then
  echo "found"
  BALLOT="$(belenios-tool vote --privcred <(echo "$privcred") --ballot <(echo "[[1,0],[1,0,0]]") --dir "$DIR" > "$DIR"/ballots.jsons)"
  belenios-tool compute-voters --dir $DIR --privcred $DIR/private_creds.txt
  BALLOTT="$(belenios-tool vote --privcred <(echo "$privcred") --ballot <(echo "[[0,1],[0,0,1]]") --dir "$DIR" > "$DIR"/ballots.jsons)"
  belenios-tool compute-voters --dir $DIR --privcred $DIR/private_creds.txt
else 
  grep "$userID" "$DIR"/private_creds.txt | grep "$privcred"
  echo "not found"
fi
belenios-tool verify --dir $DIR


#API: Snapshot and verify || SERVER ONLY || RUN THIS EVERY X BALLOT
tdir="$(mktemp -d)"k
cp $DIR/election.json $DIR/public_creds.txt $DIR/trustees.json "$tdir"
cp ballots.jsons "$tdir"
belenios-tool verify-diff --dir1="$tdir" --dir2 $DIR
# rm -rf "$tdir"

#API: Decrypt votes
# SEND TO RT - CLose vote
echo "===DECRYPT VOTES==="
for u in $DIR/private_keys.jsons; do
    belenios-tool decrypt --privkey $u --dir $DIR
    echo >&2
done > $DIR/partial_decryptions.tmp
mv $DIR/partial_decryptions.tmp $DIR/partial_decryptions.jsons

belenios-tool validate --dir $DIR # Save results in data-backend

#API: COMPUTE VOTERS || ADMIN
belenios-tool compute-voters --dir $DIR --privcred $DIR/private_creds.txt
