"""
This is the main file for the AI Business Forecasting API.
"""
from flask import Flask, request, jsonify
import pandas as pd
# imports flask - the app factory, request - to get the request data, jsonify - to return the response in JSON format
# imports pandas - to read the data from the CSV file

# creates the app factory
app = Flask(__name__)

# defines the home route
@app.route("/")
def home():
    # returns a JSON response with a message
    return {"message": "AI Business Forecasting API is running"}

@app.route("/predict", methods=["POST"])


if __name__ == "__main__":
    app.run(debug=True)