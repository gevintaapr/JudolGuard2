# Use official Python 3.10 slim image
FROM python:3.10-slim

# Set working directory inside the container
WORKDIR /app

# Copy requirements.txt first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files (except what is in .dockerignore)
COPY . .

# Expose port 7860 (Hugging Face Spaces default port)
EXPOSE 7860

# Command to run the FastAPI app
CMD ["uvicorn", "main_api:app", "--host", "0.0.0.0", "--port", "7860"]
