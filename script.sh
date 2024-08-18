#!/bin/bash

# Step 1: Install all dependencies in the Node project
echo "Installing Node dependencies..."
npm install || { echo "npm install failed"; exit 1; }

# Step 2: Run the Node project
echo "Starting the Node project..."
npm start & # Run in background
NODE_PID=$!
sleep 5 # Wait for the server to start (adjust this if your server takes more time)

# Step 3: Open the index page on localhost:8000
BASE_DIR="dist"
INDEX_URL="http://localhost:8000"
echo "Opening $INDEX_URL"
open $INDEX_URL

# Step 4: Crawl the page and save it as an HTML file
echo "Crawling the page and saving HTML..."
wget --mirror --convert-links --adjust-extension --page-requisites --no-parent $INDEX_URL -P ./$BASE_DIR

# Step 5: Scan all the links present on the page (same origin)
echo "Scanning links and media files on the page..."

# Create a function to recursively crawl all pages
crawl_pages() {
    local url=$1
    local output_dir=$2

    # Crawl the current URL and save the HTML and other resources in the output directory
    wget --mirror --convert-links --adjust-extension --page-requisites --no-parent "$url" -P "$output_dir"

    # Extract all links from the HTML page
    links=$(wget --spider -r -nd -nv "$url" 2>&1 | grep '^--' | awk '{ print $3 }')

    # Recursively crawl the pages and save them directly in the output directory
    for link in $links; do
        # Check if the page has already been crawled by checking if the file exists
        if [ ! -f "$output_dir/$(basename $link)" ]; then
            crawl_pages "$link" "$output_dir"
        fi
    done
}

# Start the recursive crawling process from the index page, saving all files in the output directory
crawl_pages "$INDEX_URL" "./$BASE_DIR"

# Extract the host and port from the INDEX_URL, stripping the protocol part (http:// or https://)
HOSTNAME_AND_PORT=localhost:8000

# Move the files from localhost:8000 directory to the parent directory and remove the localhost:8000 directory
if [ -d "./$BASE_DIR/$HOSTNAME_AND_PORT" ]; then
    echo "Moving files from ./$BASE_DIR/$HOSTNAME_AND_PORT to ./$BASE_DIR"
    mv ./$BASE_DIR/$HOSTNAME_AND_PORT/* ./$BASE_DIR/
    
    # Remove the empty localhost:8000 directory
    echo "Removing ./$BASE_DIR/$HOSTNAME_AND_PORT directory"
    rmdir ./$BASE_DIR/$HOSTNAME_AND_PORT
fi

# Step 6: Save all media files of the same origin
echo "Saving media files from the same origin..."

# wget already saves the media files, so this step is redundant.

# Once the crawling is done, kill the Node process
echo "Killing all Node processes..."
kill $NODE_PID
pkill node
