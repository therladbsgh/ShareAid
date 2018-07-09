#!/bin/sh

# Notes on variables:
# $1: Instagram username
# $2: User Id
# $3: Local path to camera roll photos
# all subsequent variables: names (not filepaths) of images from camera roll to caption. Can be theoretically infinite number 

# For now, for cleanliness, I'm emptying out a number of the folders that will have files put into them.
# Note: DO NOT ERASE data/caption_dataset/40000.vocab or data/hashtag_dataset/60000.vocab. These files are generated
# by the long-term training of the system and will not be recreated in this script. Same goes for anything in the checkpoints folder.
rm attend2u/data/json/*
rm attend2u/data/images/*
rm "attend2u/data/caption_dataset/$1_train.txt"
rm "attend2u/data/caption_dataset/$1_test.txt"
rm ./caption_results.txt

# Note: if resnet_pool5_features already has all of the images listed in the file fed to cnn_feature_extractor, TF will produce an error.
# The cleanest way I see to alleviate this is just to empty out the resnet_pool5_features directory each time we run through the pipeline
rm attend2u/data/resnet_pool5_features/*

# Note: We are using the attend2u system to learn on the user's instagram post/caption pairs and then caption new photos
# This means that all of the user's Instagram photos are the training data,
# and the test data is the image(s) from the camera roll we want to caption
cp "$1.json" "attend2u/data/json/$1_train.json"
cp "$1_to_caption.json" "attend2u/data/json/$1_test.json"
for i in `seq 4 $#`
do
  cp "$3${!i}" "attend2u/data/images/$2_@_${!i}"
done

python attend2u/data/download_images_from_json.py "attend2u/data/json/$1_train.json" "attend2u/data/images/"

source attend2u/attend2u_env/bin/activate

python attend2u/scripts/generate_shareaid_data.py "$1_train.json" "$1_test.json" "$1_train.txt" "$1_test.txt"
python attend2u/scripts/cnn_feature_extractor.py --gpu_id 0 --batch_size 32 --input_fname "attend2u/data/caption_dataset/$1_train.txt"
python attend2u/scripts/cnn_feature_extractor.py --gpu_id 0 --batch_size 32 --input_fname "attend2u/data/caption_dataset/$1_test.txt"
python attend2u/label_local.py $1

mv "./$1" "$1_caption_results.json"
# When label_local finishes, the captions of all the photos will be stored in caption_results.txt in the directory this was run from. 
# I'm leaving it to the caller of this script to arrange that data into whatever appropriate form.
