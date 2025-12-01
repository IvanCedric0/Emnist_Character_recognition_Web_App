from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np

# ---------- MODEL + NN CODE ----------

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def forwardPropagation(X, params):
    w1, b1, w2, b2 = params

    Z1 = w1.dot(X) + b1          # (hidden, m)
    A1 = np.tanh(Z1)             # (hidden, m)
    Z2 = w2.dot(A1) + b2         # (num_classes, m)
    A2 = sigmoid(Z2)             # (num_classes, m)

    epsilon = 1e-15
    A2 = np.clip(A2, epsilon, 1 - epsilon)
    return Z1, A1, Z2, A2

def get_predictions(A2):
    return np.argmax(A2, axis=0)

def predict_image(img_array, params):
    """
    img_array: 2D numpy array (28, 28), dtype float32 or float64, 0..255
    returns: class index (0..61) for EMNIST ByClass
    """
    X = img_array / 255.0              # scale like training
    X = X.ravel().reshape(1, 28*28).T  # (784, 1)
    _, _, _, A2 = forwardPropagation(X, params)
    pred_idx = int(get_predictions(A2)[0])  # scalar index 0..61
    return pred_idx

# ---------- EMNIST ByClass index -> character mapping ----------

EMNIST_BYCLASS_IDX_TO_CHAR: dict[int, str] = {}

# 0–9 -> '0'..'9'
for i in range(10):
    EMNIST_BYCLASS_IDX_TO_CHAR[i] = chr(ord('0') + i)

# 10–35 -> 'A'..'Z'
for i in range(26):
    EMNIST_BYCLASS_IDX_TO_CHAR[10 + i] = chr(ord('A') + i)

# 36–61 -> 'a'..'z'
for i in range(26):
    EMNIST_BYCLASS_IDX_TO_CHAR[36 + i] = chr(ord('a') + i)

def decode_emnist_byclass(idx: int) -> str:
    return EMNIST_BYCLASS_IDX_TO_CHAR.get(idx, '?')

# ---------- LOAD MODEL ----------

model = np.load("emnist_byclass_ANN_256hs_subset.npz")
w1 = model["w1"]
b1 = model["b1"]
w2 = model["w2"]
b2 = model["b2"]
params = [w1, b1, w2, b2]

# ---------- FLASK APP ----------

app = Flask(__name__)
CORS(app)  # allow requests from Next.js (localhost:3000)

@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    # Open image, convert to grayscale, resize 28x28
    img = Image.open(file).convert("L")
    img = img.resize((28, 28))

    img_array = np.array(img).astype(np.float32)

    # Invert image 
    # img_array = 255 - img_array

    pred_idx = predict_image(img_array, params)
    pred_char = decode_emnist_byclass(pred_idx)

    return jsonify({
        "prediction_index": pred_idx,
        "prediction_char": pred_char
    })

if __name__ == "__main__":
    app.run(debug=True)
