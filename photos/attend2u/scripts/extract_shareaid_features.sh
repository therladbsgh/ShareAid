python generate_shareaid_dataset.py
python cnn_feature_extractor.py --gpu_id 0 --batch_size 32 --input_fname ../data/caption_dataset/train.txt
python cnn_feature_extractor.py --gpu_id 0 --batch_size 32 --input_fname ../data/caption_dataset/test.txt

