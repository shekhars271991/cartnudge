"""
Application configuration settings.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "CartNudge Data Platform"
    app_env: str = "development"
    debug: bool = True
    
    # MongoDB
    mongodb_url: str = "mongodb://cartnudge:cartnudge_dev@localhost:27017"
    mongodb_db_name: str = "dataplatform"
    
    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_topic_events: str = "events"
    
    # Aerospike
    aerospike_hosts: str = "localhost:3000"
    aerospike_namespace: str = "features"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
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
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
