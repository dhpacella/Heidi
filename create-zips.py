#!/usr/bin/env python3
import zipfile
import os
import sys

base_dir = r"C:\Users\Administrator\OneDrive - Cushing Transportation, Inc\Documents\Dominic's Coding\Projects\heidi-voter-dashboard\server\lambda-deploy"
functions = ['emailEventProcessor', 'gpsProcessor', 'blastDispatcher', 'lighthouseAudit', 'sesEventProcessor']

for func in functions:
    func_dir = os.path.join(base_dir, func)
    zip_path = os.path.join(base_dir, f"{func}.zip")

    # Remove old zip
    if os.path.exists(zip_path):
        os.remove(zip_path)

    print("Creating " + func + ".zip...", end=" ")

    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(func_dir):
                # Skip node_modules/.bin and other large directories
                dirs[:] = [d for d in dirs if d not in ['.git', '.gitignore']]

                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, func_dir)
                    zf.write(file_path, arcname)

        size_mb = os.path.getsize(zip_path) / (1024 * 1024)
        print("OK (" + str(round(size_mb, 2)) + " MB)")
    except Exception as e:
        print("Failed: " + str(e))
        sys.exit(1)

print("\nAll zip files created!")
