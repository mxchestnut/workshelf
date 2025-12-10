-- Initialize databases and schemas for local development

-- Create storage database
CREATE DATABASE workshelf_storage;

-- Create keycloak schema in main database
CREATE SCHEMA IF NOT EXISTS keycloak;
