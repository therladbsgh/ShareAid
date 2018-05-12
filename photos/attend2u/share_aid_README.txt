Quirk log

-when doing cnn_feature_extractor— had ti. upgrade to 1.3 lol

-resnet_pool5_features folder has to be empty [rename current one under diff name and create a new folder with this title?]
3 minutes

Shorter jankier method (generating labels for a photo on a model that wasn't trained with their photos)

-coming soon-


Actual long steps to generate for properly for a person (training on their old posts! --involves training model from scratch but should not take
nearly as long as original training since the dataset will be wayyyy smaller (est ~1 day depending on grid resources avail? if you have like 1000 posts, which is how much I was able to pull from snooki, who is semi famous i think))


cd into attend2u dir:
‘cd /gpfs/main/research/hci/shareAid/attend2u’

From hereon I will refer to the above attend2u directory as ‘{attend2u_dir}’

1. Make sure virtual env is activated so you’ve got the appropriate python libraries:

‘source a2u_env/bin/activate’

2. Convert the json data from the scraper generated son file into the necessary format for attend2u by running my nifty script:

‘cd data/json’ 
‘python convert.py -path to your shared json file-’

when you do ‘ls’, you should see two new files titled in the following format:
‘{your original son file title}-train.json’
‘{your original son file title}-test.json’

From hereon I will refer to the above files as:
‘{user}-train.json’
‘{user}-test.json’

Download the images mentioned in said files into the appropriate directory [note that model expects images to be in the folder called 'images' --if said folder is full with another run of stuff that you need, maybe rename that folder, and create a new
empty 'images' folder for this run]

cd into ‘{attend2u_dir}/data/images’ and run:
‘python download_images_from_json.py ../json/{user}-train.json’
‘python download_images_from_json.py ../json/{user}-test.json’

3. Generate shared data
cd into ‘{attend2u_dir}/scripts’ 
Open the generate_shareaid_data.py file and change the train and test json name path near the top of the file appropriately to match
the jsons you generated

Make sure you have an empty “caption_dataset” folder (feel free here to rename the current existing one in the data dir and then create a new empty one for with the same title of “caption_dataset”
and run:
[you do not do this step if you are not retraining the net on new user data]
‘python generate_shareaid_data.py’


generate features [refer to extract_shareaid_features.sh]
[TODO: make a version of this for labelling]

it'll metnion stuff like this:
'python cnn_feature_extractor.py '

'python cnn_feature_extractor.py --gpu_id 0 --batch_size 32 --input_fname ../data/caption_dataset/train.txt'
'python cnn_feature_extractor.py --gpu_id 0 --batch_size 32 --input_fname ../data/caption_dataset/test.txt'




Attain an empty checkpoints file before training (similar reasons as needing an empty image folder--the new model expects this)



