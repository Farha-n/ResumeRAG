const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'resumerag.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'user' CHECK(role IN ('user', 'recruiter', 'admin')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Resumes table
      db.run(`
        CREATE TABLE IF NOT EXISTS resumes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          content TEXT,
          parsed_data TEXT,
          embeddings TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Jobs table
      db.run(`
        CREATE TABLE IF NOT EXISTS jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          requirements TEXT,
          company TEXT,
          location TEXT,
          salary_range TEXT,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `);

      // Job matches table
      db.run(`
        CREATE TABLE IF NOT EXISTS job_matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          job_id INTEGER NOT NULL,
          resume_id INTEGER NOT NULL,
          match_score REAL NOT NULL,
          evidence TEXT,
          missing_requirements TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (job_id) REFERENCES jobs (id),
          FOREIGN KEY (resume_id) REFERENCES resumes (id)
        )
      `);

      // Search queries table for caching
      db.run(`
        CREATE TABLE IF NOT EXISTS search_queries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          query TEXT NOT NULL,
          results TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Applications table
      db.run(`
        CREATE TABLE IF NOT EXISTS applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          job_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          resume_id INTEGER NOT NULL,
          cover_letter TEXT,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewing', 'accepted', 'rejected')),
          notes TEXT,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (job_id) REFERENCES jobs (id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (resume_id) REFERENCES resumes (id)
        )
      `);

      // Idempotency keys table
      db.run(`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
          key TEXT PRIMARY KEY,
          response TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_job_matches_job_id ON job_matches(job_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_job_matches_resume_id ON job_matches(resume_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)`);

      // Seed initial data
      seedInitialData()
        .then(() => {
          console.log('Database initialized successfully');
          resolve();
        })
        .catch(reject);
    });
  });
};

// Seed initial data
const seedInitialData = async () => {
  return new Promise((resolve, reject) => {
    // Check if admin user already exists
    db.get('SELECT id FROM users WHERE email = ?', ['admin@resumerag.com'], (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (!row) {
        // Create admin user
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(
          'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
          ['admin@resumerag.com', hashedPassword, 'Admin User', 'admin'],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            console.log('Admin user created: admin@resumerag.com / admin123');
          }
        );

        // Create test recruiter
        const recruiterPassword = bcrypt.hashSync('recruiter123', 10);
        db.run(
          'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
          ['recruiter@company.com', recruiterPassword, 'Test Recruiter', 'recruiter'],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            console.log('Test recruiter created: recruiter@company.com / recruiter123');
          }
        );

        // Create test user
        const userPassword = bcrypt.hashSync('user123', 10);
        db.run(
          'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
          ['user@example.com', userPassword, 'Test User', 'user'],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            console.log('Test user created: user@example.com / user123');
          }
        );

        // Create sample job
        db.run(
          `INSERT INTO jobs (title, description, requirements, company, location, salary_range, created_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            'Senior Software Engineer',
            'We are looking for a Senior Software Engineer to join our team. You will be responsible for developing and maintaining our web applications using modern technologies.',
            '5+ years experience with JavaScript/Node.js, React, SQL databases, REST APIs, Git version control',
            'TechCorp Inc.',
            'San Francisco, CA',
            '$120,000 - $150,000',
            2 // recruiter user id
          ],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            console.log('Sample job created');
            resolve();
          }
        );
      } else {
        resolve();
      }
    });
  });
};

module.exports = { db, initDatabase };
