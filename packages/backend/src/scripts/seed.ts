import { connect } from 'mongoose';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Filter } from '../models/Filter';
import { Datasource } from '../models/Datasource';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/filterpro';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Project.deleteMany({});
    await Filter.deleteMany({});
    await Datasource.deleteMany({});

    // Create demo user
    console.log('Creating demo user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await User.create({
      name: 'Admin User',
      email: 'admin@filterpro.com',
      password: hashedPassword
    });

    // Create demo project
    console.log('Creating demo project...');
    const project = await Project.create({
      name: 'E-commerce Demo',
      description: 'Demo project for e-commerce product filtering',
      projectKey: 'ecommerce_demo',
      userId: user._id,
      settings: {
        allowPublicAccess: true,
        cacheQueries: true,
        enableAuditLog: true
      }
    });

    // Create demo datasource
    console.log('Creating demo datasource...');
    const datasource = await Datasource.create({
      name: 'Products Database',
      type: 'rest_api',
      projectId: project._id,
      config: {
        baseUrl: 'https://dummyjson.com/products',
        headers: { 'Content-Type': 'application/json' },
        pagination: {
          type: 'offset',
          limitParam: 'limit',
          offsetParam: 'skip',
          defaultLimit: 20
        }
      },
      fields: [
        { name: 'id', type: 'number', label: 'Product ID' },
        { name: 'title', type: 'string', label: 'Product Name' },
        { name: 'price', type: 'number', label: 'Price' },
        { name: 'category', type: 'string', label: 'Category' },
        { name: 'brand', type: 'string', label: 'Brand' },
        { name: 'rating', type: 'number', label: 'Rating' },
        { name: 'stock', type: 'number', label: 'Stock' }
      ]
    });

    // Create demo filters
    console.log('Creating demo filters...');
    
    // Price range filter
    await Filter.create({
      name: 'Price Range',
      type: 'range',
      projectId: project._id,
      datasourceId: datasource._id,
      config: {
        field: 'price',
        min: 0,
        max: 2000,
        step: 10,
        label: 'Price ($)',
        defaultValue: [0, 1000]
      },
      isActive: true,
      order: 1
    });

    // Category filter
    await Filter.create({
      name: 'Category',
      type: 'select',
      projectId: project._id,
      datasourceId: datasource._id,
      config: {
        field: 'category',
        multiple: true,
        label: 'Category',
        options: [
          { value: 'smartphones', label: 'Smartphones' },
          { value: 'laptops', label: 'Laptops' },
          { value: 'fragrances', label: 'Fragrances' },
          { value: 'skincare', label: 'Skincare' },
          { value: 'groceries', label: 'Groceries' },
          { value: 'home-decoration', label: 'Home Decoration' }
        ]
      },
      isActive: true,
      order: 2
    });

    // Brand filter
    await Filter.create({
      name: 'Brand',
      type: 'autocomplete',
      projectId: project._id,
      datasourceId: datasource._id,
      config: {
        field: 'brand',
        multiple: true,
        label: 'Brand',
        placeholder: 'Search brands...',
        minCharacters: 2
      },
      isActive: true,
      order: 3
    });

    // Rating filter
    await Filter.create({
      name: 'Minimum Rating',
      type: 'range',
      projectId: project._id,
      datasourceId: datasource._id,
      config: {
        field: 'rating',
        min: 0,
        max: 5,
        step: 0.1,
        label: 'Minimum Rating',
        defaultValue: [0]
      },
      isActive: true,
      order: 4
    });

    // Stock filter
    await Filter.create({
      name: 'In Stock Only',
      type: 'boolean',
      projectId: project._id,
      datasourceId: datasource._id,
      config: {
        field: 'stock',
        label: 'In Stock Only',
        trueCondition: { operator: 'gt', value: 0 },
        falseCondition: null
      },
      isActive: true,
      order: 5
    });

    console.log('Seed data created successfully!');
    console.log(`Project Key: ${project.projectKey}`);
    console.log(`Demo User: admin@filterpro.com / admin123`);
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit(0);
  }
}

seed();