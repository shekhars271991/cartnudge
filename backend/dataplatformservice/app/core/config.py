"""
Application configuration settings.
"""
from __future__ import annotations

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    # Application
    app_name: str = "CartNudge Data Platform"
    app_env: str = "development"
    debug: bool = True
    
    # MongoDB
    mongodb_url: str = "mongodb://cartnudge:cartnudge_dev@localhost:27018"
    mongodb_db_name: str = "dataplatform"
    
    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_topic_events: str = "events"
    
    # Aerospike
    aerospike_hosts: str = "localhost:3010"
    aerospike_namespace: str = "test"  # Default Aerospike namespace
    
    # ClickHouse
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_user: str = "cartnudge"
    clickhouse_password: str = "cartnudge_dev"
    clickhouse_database: str = "events"
    
    # JWT Settings (must match Identity Service)
    jwt_secret_key: str = "your-super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    
    # Identity Service (for authorization checks)
    identity_service_url: str = "http://localhost:8001"
    
    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def aerospike_hosts_list(self) -> list[tuple[str, int]]:
        """Parse Aerospike hosts."""
        hosts = []
        for host in self.aerospike_hosts.split(","):
            parts = host.strip().split(":")
            hosts.append((parts[0], int(parts[1]) if len(parts) > 1 else 3000))
        return hosts


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
