const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Contact = mongoose.model('Contact');

describe('Contacts API Endpoints', () => {
  let findSpy, findByIdSpy, findOneSpy, createSpy, findByIdAndUpdateSpy, findByIdAndDeleteSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup spies on Mongoose model methods
    findSpy = jest.spyOn(Contact, 'find');
    findByIdSpy = jest.spyOn(Contact, 'findById');
    findOneSpy = jest.spyOn(Contact, 'findOne');
    createSpy = jest.spyOn(Contact, 'create');
    findByIdAndUpdateSpy = jest.spyOn(Contact, 'findByIdAndUpdate');
    findByIdAndDeleteSpy = jest.spyOn(Contact, 'findByIdAndDelete');
  });

  afterEach(() => {
    // Restore original implementations after each test
    findSpy.mockRestore();
    findByIdSpy.mockRestore();
    findOneSpy.mockRestore();
    createSpy.mockRestore();
    findByIdAndUpdateSpy.mockRestore();
    findByIdAndDeleteSpy.mockRestore();
  });

  // Clean up mongoose connections to prevent hanging test runner
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/contacts', () => {
    it('should return all contacts successfully', async () => {
      const mockContacts = [
        { _id: '507f1f77bcf86cd799439011', name: 'John Doe', email: 'john@example.com', phone: '1234567890', gender: 'Male', address: '123 Main St' },
        { _id: '507f1f77bcf86cd799439012', name: 'Jane Doe', email: 'jane@example.com', phone: '0987654321', gender: 'Female', address: '456 Oak St' },
      ];

      // Mongoose find() uses a builder pattern for sorting, chaining .sort()
      findSpy.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockContacts),
      });

      const res = await request(app).get('/api/contacts');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.data).toEqual(mockContacts);
    });
  });

  describe('GET /api/contacts/:id', () => {
    it('should return a contact if id is valid and contact exists', async () => {
      const mockContact = { _id: '507f1f77bcf86cd799439011', name: 'John Doe', email: 'john@example.com', phone: '1234567890' };
      
      findByIdSpy.mockResolvedValue(mockContact);

      const res = await request(app).get(`/api/contacts/${mockContact._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockContact);
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app).get('/api/contacts/invalid-id');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid contact ID format');
    });

    it('should return 404 if contact does not exist', async () => {
      findByIdSpy.mockResolvedValue(null);

      const res = await request(app).get('/api/contacts/507f1f77bcf86cd799439011');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Contact not found');
    });
  });

  describe('POST /api/contacts', () => {
    it('should create a contact if valid data is provided', async () => {
      const newContact = { name: 'John Doe', email: 'john@example.com', phone: '1234567890', gender: 'Male', address: '123 Main St' };
      const createdContact = { ...newContact, _id: '507f1f77bcf86cd799439011' };

      findOneSpy.mockResolvedValue(null); // Simulated: Email not taken
      createSpy.mockResolvedValue(createdContact);

      const res = await request(app)
        .post('/api/contacts')
        .send(newContact);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(createdContact);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/contacts')
        .send({ name: 'John Doe' }); // Missing email and phone

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Please provide name, email, and phone fields');
    });

    it('should return 400 if email already exists', async () => {
      const newContact = { name: 'John Doe', email: 'john@example.com', phone: '1234567890' };
      findOneSpy.mockResolvedValue(newContact); // Simulates email already exists

      const res = await request(app)
        .post('/api/contacts')
        .send(newContact);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('A contact with this email already exists');
    });
  });

  describe('PUT /api/contacts/:id', () => {
    it('should update and return contact if valid data', async () => {
      const existingContact = { _id: '507f1f77bcf86cd799439011', name: 'John Doe', email: 'john@example.com', phone: '1234567890' };
      const updatedData = { phone: '0987654321' };
      const updatedContact = { ...existingContact, ...updatedData };

      findByIdSpy.mockResolvedValue(existingContact);
      findByIdAndUpdateSpy.mockResolvedValue(updatedContact);

      const res = await request(app)
        .put(`/api/contacts/${existingContact._id}`)
        .send(updatedData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe('0987654321');
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('should delete contact and return success', async () => {
      const existingContact = { _id: '507f1f77bcf86cd799439011', name: 'John Doe' };
      
      findByIdSpy.mockResolvedValue(existingContact);
      findByIdAndDeleteSpy.mockResolvedValue(existingContact);

      const res = await request(app).delete(`/api/contacts/${existingContact._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Contact deleted successfully');
    });
  });
});
