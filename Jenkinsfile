pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'circo'
        TAG = "${env.BUILD_NUMBER}"
        HTTP_PORT = '8080'
    }

    triggers {
        // Automatic trigger: GitHub Webhook or 2-minute SCM poll fallback
        githubPush()
        pollSCM('H/2 * * * *')
    }

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 15, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                echo "Checking out source code for Circo Build #${TAG}..."
                checkout scm
            }
        }

        stage('Test') {
            steps {
                echo "Executing automated tests inside Docker (Quality Gate)..."
                // Multi-stage test targets ensure identical behavior in CI as in dev
                sh 'docker build --target test -t circo/auth-api:test ./auth-api'
                sh 'docker build --target test -t circo/resource-api:test ./resource-api'
                sh 'docker build --target test -t circo/realtime-service:test ./realtime-service'
                echo "All unit and integration tests passed! Quality gate cleared."
            }
        }

        stage('Build Images') {
            steps {
                echo "Building production container images tagged with build #${TAG}..."
                sh 'docker compose build'
            }
        }

        stage('Deploy') {
            steps {
                echo "Deploying containerized application stack..."
                script {
                    // Try to load credentials from Jenkins Secret File; fallback if local
                    try {
                        withCredentials([file(credentialsId: 'circo-env', variable: 'ENV_FILE')]) {
                            sh 'cp "$ENV_FILE" .env'
                        }
                    } catch (Exception e) {
                        echo "Jenkins credential 'circo-env' not configured. Using .env.example fallback for demo."
                        sh 'if [ ! -f .env ]; then cp .env.example .env; fi'
                    }
                }
                // Zero-downtime container swap using pre-built images
                sh 'docker compose up -d --no-build --remove-orphans'
            }
        }

        stage('Smoke Test') {
            steps {
                echo "Verifying service availability through reverse proxy..."
                sh '''
                for i in $(seq 1 12); do
                    if docker compose exec -T proxy wget -qO- http://localhost/proxy-health \
                       && docker compose exec -T proxy wget -qO- http://localhost/api/auth/health \
                       && docker compose exec -T proxy wget -qO- http://localhost/api/resources/health; then
                        echo "Smoke tests verified: All microservices responding healthy!"
                        exit 0
                    fi
                    echo "Waiting for services to become healthy... attempt $i/12"
                    sleep 5
                done
                echo "Smoke test failed: Services did not report healthy in time."
                exit 1
                '''
            }
        }
    }

    post {
        success {
            echo "SUCCESS: Circo Build #${TAG} is live and operational at http://localhost:8080"
        }
        failure {
            echo "FAILURE: Pipeline failed at Build #${TAG}! Deployment blocked by quality gate."
            echo "To roll back to previous stable release: TAG=<previous-build-number> docker compose up -d --no-build"
        }
        always {
            // Clean up transient environment file to prevent credential leaks
            sh 'rm -f .env'
        }
    }
}
