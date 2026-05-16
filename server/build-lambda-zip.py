#!/usr/bin/env python3
import zipfile
import os
import sys

def create_zip(source_dir, output_file):
    """Create a zip file from a directory"""
    with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Skip certain directories
            dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', '.pytest_cache']]

            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)

    size_mb = os.path.getsize(output_file) / (1024 * 1024)
    print(f"✅ Created {output_file} ({size_mb:.1f} MB)")

if __name__ == '__main__':
    blast_dir = r"c:\Users\Administrator\OneDrive - Cushing Transportation, Inc\Documents\Dominic's Coding\Projects\heidi-voter-dashboard\server\lambda-deploy\blastDispatcher"
    zip_path = r"c:\Users\Administrator\OneDrive - Cushing Transportation, Inc\Documents\Dominic's Coding\Projects\heidi-voter-dashboard\server\lambda-deploy\blastDispatcher.zip"

    if os.path.exists(zip_path):
        os.remove(zip_path)

    create_zip(blast_dir, zip_path)
