# Sui Dhaga: Image-to-Measurements Microservice

Inference microservice for the **Sui Dhaga AI Tailors Marketplace Platform**. Takes a single full-body photo of a customer, reconstructs the 3D body using pretrained SHAPY and gendered SMPL-X models, canonicalises to a zero-pose T-pose, and calculates tailoring measurements (Height, Weight, Chest, Waist, Hips, Inseam, Sleeve, Shoulder, Neck, Thigh).

Built with **FastAPI**, **PyTorch**, **SMPL-X**, and **SciPy**. Optimized for CPU execution on Linux/macOS/Windows, with optional CUDA GPU acceleration.

---

## 1. Quickstart Setup

### Prerequisites
- Python 3.10+ (tested with Python 3.10 and 3.11)
- Git

### Installation
```bash
cd measurement-service

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies (CPU PyTorch by default)
pip install -r requirements.txt
```

---

## 2. Model Asset Verification & Manual Download

Due to research licensing restrictions, proprietary SMPL-X and SHAPY model checkpoints cannot be bundled into version control.

Run the asset verification script to check your local directory:
```bash
python scripts/check_assets.py
```

### Manual Download Steps:
1. **SMPL-X Models**:
   - Register at [https://smpl-x.is.tue.mpg.de/](https://smpl-x.is.tue.mpg.de/)
   - Download the model package and place files in:
     - `data/body_models/smplx/SMPLX_NEUTRAL.npz`
     - `data/body_models/smplx/SMPLX_FEMALE.npz`
     - `data/body_models/smplx/SMPLX_MALE.npz`
2. **SHAPY Weights**:
   - Register at [https://shapy.is.tue.mpg.de/](https://shapy.is.tue.mpg.de/)
   - Download `shapy_data.zip` or run `data/download_data.sh`
   - Place the SHAPY_A model folder in:
     - `data/trained_models/shapy/SHAPY_A/`

---

## 3. Running the Service

### Start FastAPI Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive OpenAPI Swagger UI is available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### Health Check
```bash
curl http://localhost:8000/health
```

---

## 4. API Endpoints

### `POST /v1/measure` (multipart/form-data)
Parameters:
- `image`: Full-body customer standing photo (JPEG, PNG, WebP)
- `gender`: `"male"` or `"female"`
- `height_cm`: Customer's measured height in centimeters (float, required)
- `weight_kg`: Customer's weight in kilograms (float, optional)

Example Response:
```json
{
  "measurements_cm": {
    "height": 178.0,
    "chest": 98.4,
    "waist": 82.6,
    "hips": 97.1,
    "shoulder_width": 45.2,
    "sleeve_length": 62.5,
    "inseam": 79.0,
    "neck": 38.6,
    "thigh": 55.8
  },
  "estimated_weight_kg": 73.2,
  "scale_factor": 1.035,
  "quality": {
    "passed": true,
    "warnings": []
  },
  "accuracy_note": "Estimates from a single photo; expected error is several cm. Tailor must confirm before cutting.",
  "model_info": {
    "shapy": "CVPR2022-SHAPY_A",
    "body_model": "smplx",
    "pipeline_version": "1.0.0"
  }
}
```

---

## 5. Testing & Debugging

### Run Test Suite
```bash
pytest tests/ -v
```

### Visual Debugger (Landmarks & Cutting Planes)
Renders a high-resolution PNG showing the T-pose mesh, height markers, and the 2D convex hull cross sections for Chest, Waist, and Hips:
```bash
python scripts/render_debug.py --output output/debug_mesh.png
```

### Evaluation Benchmark
Evaluates a directory of volunteer photos against tape-measured ground truth and compares with the SHAPY paper's published HBW validation results:
```bash
python scripts/evaluate.py --images-dir /path/to/photos --gt-csv /path/to/measurements.csv
```

---

## 6. Docker Deployment

```bash
docker-compose up --build -d
```

---

## 7. Licensing & Commercial Notice
SMPL-X and SHAPY models are distributed under non-commercial scientific research licenses. For commercial deployment and licensing, contact `ps-licensing@tue.mpg.de`. See [LICENSE_NOTES.md](LICENSE_NOTES.md) for full legal terms.
