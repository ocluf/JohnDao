
#!/bin/sh

cargo test
dfx deploy john_dao -m reinstall -y
# dfx deploy internet_identity -y
cd ./src/frontend
dfx generate
pattern="export const john_dao = createActor(canisterId);"
input_file="./src/declarations/john_dao/index.js"
tmp_file="$(mktemp)"

# Use grep to filter the lines that match the pattern and save to the temporary file
grep -v "$pattern" "$input_file" > "$tmp_file"

# Replace the original file with the temporary file
mv "$tmp_file" "$input_file"
cd ../..
cp -r ./src/frontend/src/declarations/john_dao ./functions