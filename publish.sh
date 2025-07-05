#!/bin/sh

# loop through array of directories
directories=(
  "/Users/saeho/Documents/apps/nebula/packages/@jsb188:app"
  "/Users/saeho/Documents/apps/nebula/packages/@jsb188:css"
  "/Users/saeho/Documents/apps/nebula/packages/@jsb188:graphql"
  "/Users/saeho/Documents/apps/nebula/packages/@jsb188:mday"
  "/Users/saeho/Documents/apps/nebula/packages/@jsb188:react"
  "/Users/saeho/Documents/apps/nebula/packages/@jsb188:react-web"
  "/Users/saeho/Documents/apps/nebula/packages/@jsb188:sse"
)

# loop through each directory and echo
for dir in "${directories[@]}"; do
  echo $dir
  cd "$dir" || exit 1

  # Check if package.json exists
  if [ ! -f package.json ]; then
    echo "package.json not found in $dir. Skipping..."
    continue
  fi

  # Publish package
  echo "Publishing package in $dir"
  npm publish --access public || exit 1

done
