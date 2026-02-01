import json
import os

from cfg import FROM_FILE_PTH, FROM_FOLDER_PATH, TO_TABLE_NAME


def split_jsonl_to_batches(input_file, batch_size=25, output_prefix="batch"):
    """
    Splits a JSONL file into multiple smaller JSON files containing batches of items for DynamoDB batch-write.

    :param input_file: Path to the input JSONL file.
    :param batch_size: Number of items per batch (max 25 for DynamoDB).
    :param output_prefix: Prefix for the output batch files.
    """
    batches = []
    with open(input_file, "r", encoding="utf-8") as infile:
        batch = []
        for line in infile:
            obj = json.loads(line)
            batch.append(obj)
            if len(batch) == batch_size:
                batches.append(batch)
                batch = []

        # Append remaining items if any
        if batch:
            batches.append(batch)

    total = len(batches)
    for i, batch in enumerate(batches):
        batch_file = f"chunks/{output_prefix}_{str(i+1).zfill(4)}_{total}.json"
        with open(batch_file, "w", encoding="utf-8") as outfile:
            json.dump(
                {
                    "RequestItems": {
                        TO_TABLE_NAME: [
                            {"PutRequest": {"Item": item}} for item in batch
                        ]
                    }
                },
                outfile,
                indent=4,
            )
        print(f"Batch {i+1} saved as {batch_file}")


if __name__ == "__main__":
    os.makedirs("chunks", exist_ok=False)
    input_file = FROM_FOLDER_PATH + "\\" + FROM_FILE_PTH
    split_jsonl_to_batches(input_file)
