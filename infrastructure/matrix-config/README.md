# Matrix Synapse Config (Secure Template Flow)

This folder contains the Synapse homeserver configuration for Work Shelf.

Security-first workflow:

- Do NOT place real secrets in `homeserver.yaml`. It should only contain placeholders.
- Use `homeserver.yaml.template` which includes `${REGISTRATION_SHARED_SECRET}`.
- The upload script `scripts/upload-matrix-config.sh` will:
  - Fetch the shared secret from AWS Secrets Manager (default secret name: `workshelf/matrix-registration-secret`), or use the `MATRIX_REGISTRATION_SHARED_SECRET` env var.
  - Render the template and upload the rendered file to EFS via a one-time ECS task.

Steps to rotate / upload:

1) Create or rotate the secret in AWS Secrets Manager:
   - Name: `workshelf/matrix-registration-secret` (or set `MATRIX_REGISTRATION_SECRET_NAME`)
   - Value: new random string (at least 32 chars)
2) Run:
   - `bash scripts/upload-matrix-config.sh`
3) Check logs printed by the script for "Config files uploaded successfully!"

Notes:
- `homeserver.yaml` is kept as a non-secret placeholder. Production always uses the rendered file uploaded to EFS.
- If you need to override how the secret is sourced, export `MATRIX_REGISTRATION_SHARED_SECRET` before running the script.