import { connectDb } from './models';
import { Project } from './models/Project';
import { Filter } from './models/Filter';
import { Datasource } from './models/Datasource';
import bcrypt from 'bcryptjs';
import { User } from './models/User';

async function seed() {
  await connectDb();
  console.log('Connected to DB for seeding');
  const projectKey = 'demo-project';
  await Project.updateOne({ projectKey }, { projectKey, name: 'Demo Project' }, { upsert: true });
  await Datasource.updateOne({ projectKey, id: 'demo-collection' }, { projectKey, id: 'demo-collection', type: 'mongodb', config: { collectionName: 'demo_collection' } }, { upsert: true });

  // sample filters: country -> city -> date range
  const f1 = { projectKey, name: 'Country', slug: 'country', type: 'select', optionsConfig: { static: [{ label: 'Brazil', value: 'BR' }, { label: 'USA', value: 'US' }] } };
  const f2 = { projectKey, name: 'City', slug: 'city', type: 'select', dependencies: [{ sourceFilterId: 'country', type: 'restrictOptions' }], optionsConfig: { dynamic: { datasourceId: 'demo-collection', template: { country: '{{country}}' } } } };
  const f3 = { projectKey, name: 'DateRange', slug: 'date_range', type: 'range', uiConfig: { mode: 'date' } };

  await Filter.updateOne({ projectKey, slug: f1.slug }, f1, { upsert: true });
  await Filter.updateOne({ projectKey, slug: f2.slug }, f2, { upsert: true });
  await Filter.updateOne({ projectKey, slug: f3.slug }, f3, { upsert: true });

  // create admin user
  const hashed = await bcrypt.hash('admin123', 10);
  await User.updateOne(
    { email: 'admin@filterpro.com' }, 
    { 
      email: 'admin@filterpro.com', 
      name: 'Admin FilterPro',
      role: 'admin', 
      hashedPassword: hashed, 
      projectKeys: [projectKey] 
    }, 
    { upsert: true }
  );

  console.log('Seeding done');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
