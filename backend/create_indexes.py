#!/usr/bin/env python3
"""
Script to create database indexes for better performance
"""
from db import recipes_collection

def create_indexes():
    try:
        # Create text index on title for faster text search
        recipes_collection.create_index([("title", "text")])
        print("✓ Created text index on 'title' field")
        
        # Create compound index for common queries
        recipes_collection.create_index([
            ("title", 1),
            ("ingredients", 1)
        ])
        print("✓ Created compound index on 'title' and 'ingredients'")
        
        # List all indexes
        indexes = recipes_collection.list_indexes()
        print("\nCurrent indexes:")
        for idx in indexes:
            print(f"  - {idx}")
            
    except Exception as e:
        print(f"Error creating indexes: {e}")

if __name__ == "__main__":
    create_indexes()
