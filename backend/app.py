from flask import Flask, request
from flask_cors import CORS
from sklearn.ensemble import RandomForestRegressor
from sklearn.neighbors import KNeighborsClassifier
import pickle
import os
import numpy as np

import pandas as pd

from PIL import Image
from io import BytesIO
import base64
import json
import re
import sys

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1000 * 1000

randomforest_model = None

@app.route("/api/prediction/mens", methods=['GET'])
def predict():
    age = int(request.args['age'])
    weight = float(request.args['weight'])
    height = float(request.args['height'])
    lengthCycle = int(request.args['cycle'])
    lengthMens = int(request.args['menses'])

    randomforest_model = RandomForestRegressor(max_depth=10, max_features=3, random_state=42)
    model_filename = os.path.join(os.path.dirname(
        os.path.abspath(__file__)), "../backend/randomforest_regression.pkl")
    with open(model_filename, 'rb') as f:
        randomforest_model = pickle.load(f)

    # [age, weight, height, lengthCycle, lengthMens]
    prediction = randomforest_model.predict([[age, height, weight, lengthCycle, lengthMens]])
    return str(round(prediction[0], 2))

@app.route("/")
def hello_world():

    print(request.args)
    return "<p>Current model!</p>" 

# if this is the main thread of execution first load the model and
# then start the server
if __name__ == "__main__" or __name__ == "app" or __name__ == "flask_app":
    print(("* Loading model and Flask starting server..."
           "please wait until server has fully started"))

    print(sys.executable)
    print('running')

