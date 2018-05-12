import json
import sys
import subprocess


def _wget_dl(url, destination, file_name, try_number, time_out):
    command=["wget", "-c", "-P", destination, "-t", try_number, "-T", time_out, url, "-O", file_name]
    try:
        download_state=subprocess.call(command)
    except Exception as e:
        print(e)
    #if download_state==0 => successfull download
    return download_state

def extract_from_file(file_dir, destination):
	file_contents = open(file_dir).read()
	json_data = json.loads(file_contents)
	
	converted_json = {}

	for user_entry in json_data:
		for entry_id in json_data[user_entry]:
			entry_parts = entry_id.split("_")
			
			user_id = entry_parts[-1]
			photo_id = entry_id.rsplit("_" + user_id, 1)[0]
			if user_id:
				image_name = user_id + "_@_" + photo_id + "_" + user_id
				photo_entry = json_data[user_entry][entry_id]
				# print(photo_id)
				print(image_name)
				_wget_dl(photo_entry["l_url"], destination, image_name, "10", "60")

def main():
	# run this script from the data/shareaid_iamges folder
    # print command line arguments
    filedir = sys.argv[1]
    extract_from_file(filedir, "cries everything goes to the directory you run this from anyways")

if __name__ == "__main__":
    main()
