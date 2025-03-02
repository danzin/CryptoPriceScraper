import argparse
import subprocess
import time

parser = argparse.ArgumentParser(description="Run Node.js scraper with given coins.")
parser.add_argument(
    "--coins",
    type=str,
    required=True,
    help="Comma-separated list of coins"
)
args = parser.parse_args()

COINS = args.coins

NODE_SCRIPT = "index.js"

while True:
    print(f"Running the Node.js scraper with coins: {COINS}")
    # Run the Node.js script with coins as an argument.
    result = subprocess.run(
        ["node", NODE_SCRIPT, "--coins", COINS],
        capture_output=True,
        text=True
    )

    print("STDOUT:")
    print(result.stdout)
    print("STDERR:")
    print(result.stderr)

    print("Sleeping for 10 minutes...")
    time.sleep(600)  # Sleep for 600 seconds (10 minutes)
