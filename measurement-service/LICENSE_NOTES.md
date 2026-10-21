# Licensing and Usage Notes: SMPL-X & SHAPY

## Research & Non-Commercial Use Only
The 3D body models (SMPL-X) and body shape regressor network (SHAPY) utilized by this service are subject to proprietary research licenses and are **not open source under MIT/Apache**:

1. **SHAPY License (Max-Planck-Gesellschaft zur Förderung der Wissenschaften e.V. - MPG)**
   - Paper: *"Accurate 3D Body Shape Regression using Metric and Semantic Attributes"* (Choutas et al., CVPR 2022)
   - Code & Model weights are licensed for **non-commercial scientific research purposes only**.
   - Any deployment for commercial revenue, business services, customer-facing production operations, or proprietary software requires a separate commercial license from MPG.
   - For commercial licensing inquiries: contact **`ps-licensing@tue.mpg.de`**.

2. **SMPL-X License (Max-Planck-Gesellschaft - MPG)**
   - The SMPL-X neutral, female, and male body models are licensed strictly for non-commercial research by the Max Planck Institute for Intelligent Systems.
   - Official registration and agreement: [https://smpl-x.is.tue.mpg.de/](https://smpl-x.is.tue.mpg.de/)
   - Commercial licensing information: [https://smpl-x.is.tue.mpg.de/license](https://smpl-x.is.tue.mpg.de/license)

## Production & Commercial Deployment
Before deploying Sui Dhaga's Image-to-Measurements service into a commercial production environment or monetizing tailor orders derived from this pipeline:
1. Contact Max-Planck-Innovation (`ps-licensing@tue.mpg.de`) to obtain a commercial license agreement for both SMPL-X and SHAPY.
2. Ensure no model weights or checkpoints are redistributed, hosted publicly, or committed into version control repositories.
