# Docker Cheat Sheet

## Images
| Command | Use |
|---|---|
| `docker build -t cdac-taskmanager .` | Build an image from the Dockerfile in this folder |
| `docker images` | List images |
| `docker pull python:3.12-slim` | Download an image |
| `docker rmi <image>` | Delete an image |
| `docker tag cdac-taskmanager myrepo/cdac-taskmanager:v1` | Add a name/tag (needed before pushing) |

## Containers
| Command | Use |
|---|---|
| `docker run -p 8080:8080 cdac-taskmanager` | Start a container, map host port 8080 to container port 8080 |
| `docker run -d -p 8080:8080 --name taskapp cdac-taskmanager` | Same, in the background with a name |
| `docker ps` / `docker ps -a` | Running containers / all containers |
| `docker stop taskapp` / `docker start taskapp` | Stop / start |
| `docker rm taskapp` / `docker rm -f taskapp` | Delete / force delete |

## Debugging
| Command | Use |
|---|---|
| `docker logs taskapp` / `docker logs -f taskapp` | View / follow logs |
| `docker exec -it taskapp sh` | Open a shell inside the container |
| `docker inspect taskapp` | Full details |

## Registry
| Command | Use |
|---|---|
| `docker login` | Log in to Docker Hub |
| `docker push myrepo/cdac-taskmanager:v1` | Upload an image |

## Cleanup
| Command | Use |
|---|---|
| `docker system prune` | Remove stopped containers and dangling images |
| `docker system prune -a` | Also remove all unused images |

## Class order
`build → run → ps → logs → stop → rm → tag → push`
