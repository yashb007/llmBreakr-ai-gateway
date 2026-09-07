# Deploying to Kubernetes

Plain manifests, no Helm required. One Deployment runs the same single
container as `docker-compose.yml` — the gateway API + admin API (port 4000)
and the admin dashboard (port 3000) as two processes in one pod.

You need an existing MySQL database and Redis instance reachable from the
cluster — this deployment doesn't run either (same call already made for
`docker-compose.yml`: bring your own, managed or self-hosted).

## Deploy

```bash
# 1. Non-sensitive config
kubectl apply -f configmap.yaml   # edit DB/Redis host, super admin email first

# 2. Secrets — never commit secret.yaml
cp secret.example.yaml secret.yaml
$EDITOR secret.yaml               # fill in real DB password, JWT_SECRET, CREDENTIAL_ENCRYPTION_KEY, LOADER_HASH
kubectl apply -f secret.yaml

# 3. The app
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# 4. Optional — external access by hostname
kubectl apply -f ingress.yaml     # requires an ingress controller; edit hosts first

# 5. Optional — autoscaling beyond 1 replica
kubectl apply -f hpa.yaml         # requires metrics-server
```

Check it came up:

```bash
kubectl rollout status deployment/llmbreakr
kubectl port-forward svc/llmbreakr 4000:4000 3000:3000
curl localhost:4000/healthz   # {"status":"ok"}
```

Dashboard at `localhost:3000`, gateway API at `localhost:4000`.

## Scaling beyond 1 replica

Safe to do — auth, rate-limit, and budget state live in Redis, not
in-process, so any pod can serve any request. Bump `replicas` in
`deployment.yaml` or apply `hpa.yaml` for automatic scaling.

## Updating the image

New image tags are published automatically on release (see
`.github/workflows/`). To roll a running deployment onto a new tag:

```bash
kubectl set image deployment/llmbreakr llmbreakr=yashbansal0412/llmbreakr-ai-gateway:v1.2.3
```

Avoid `:latest` in production — pin a version tag so rollouts are
predictable and `kubectl rollout undo` actually rolls back to something.
