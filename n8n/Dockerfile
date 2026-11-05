FROM docker.n8n.io/n8nio/n8n:latest

USER root
# Pre-create directory if needed
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node/.n8n

USER node
EXPOSE 5678
CMD ["n8n", "start"]
