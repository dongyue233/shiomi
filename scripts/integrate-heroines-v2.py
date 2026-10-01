#!/usr/bin/env python3
"""Apply the published Shiomi v0.10.0 reader to an existing character card."""
import argparse
import base64
import json
from pathlib import Path
from urllib.request import Request, urlopen

ASSET_COMMIT = "35d9d84e5bae74360afcb1634d45bfb20b004a39"
READER_BLOB = "6dd7a1f9ad807876f1e4dcd93c4e8711d6f830d0"
READER_ID = "67950aef-e4bb-41bf-ab84-1ab65140a398"
MANIFEST_URL = "https://cdn.jsdelivr.net/gh/dongyue233/shiomi@" + ASSET_COMMIT + "/assets/sprites/heroines-v2/manifest.json"

def integrate(card, reader):
    if "SPRITE_COMMIT_PENDING" in reader:
        raise ValueError("Reader still contains an unpublished asset placeholder")
    scripts = card["data"]["extensions"]["tavern_helper"]["scripts"][0]["scripts"]
    target = [script for script in scripts if script.get("id") == READER_ID]
    if len(target) != 1:
        raise ValueError("Expected exactly one Shiomi reader script")
    target[0]["content"] = reader
    card["data"]["character_version"] = "1.33.52"
    card["data"]["extensions"]["shiomi_sprite_resources_v2"] = {
        "manifest_url": MANIFEST_URL,
        "commit": ASSET_COMMIT,
        "asset_count": 30,
        "reader_version": "0.10.0",
    }
    return card

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("card", type=Path)
    parser.add_argument("-o", "--output", type=Path,
                        default=Path("汐见_v1.33.52_五位女角色立绘升级.json"))
    parser.add_argument("--reader", type=Path,
                        help="Optional local copy of the published reader")
    args = parser.parse_args()
    card = json.loads(args.card.read_text(encoding="utf-8"))
    if args.reader:
        reader = args.reader.read_text(encoding="utf-8")
    else:
        url = "https://api.github.com/repos/dongyue233/shiomi/git/blobs/" + READER_BLOB
        request = Request(url, headers={"Accept": "application/vnd.github+json",
                                       "User-Agent": "shiomi-card-integrator"})
        with urlopen(request, timeout=60) as response:
            blob = json.load(response)
        if blob.get("sha") != READER_BLOB or blob.get("encoding") != "base64":
            raise ValueError("Unexpected reader blob response")
        reader = base64.b64decode(blob["content"]).decode("utf-8")
    updated = integrate(card, reader)
    args.output.write_text(json.dumps(updated, ensure_ascii=False, indent=2),
                           encoding="utf-8")
    print(args.output.resolve())

if __name__ == "__main__":
    main()
