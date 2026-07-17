import { getDatabaseState, isDatabaseReady, pingDatabase } from '../../config/database';
import { MongooseHealthRepository } from './health.repository';

jest.mock('../../config/database', () => ({
  getDatabaseState: jest.fn(),
  isDatabaseReady: jest.fn(),
  pingDatabase: jest.fn(),
}));

const mockedGetDatabaseState = jest.mocked(getDatabaseState);
const mockedIsDatabaseReady = jest.mocked(isDatabaseReady);
const mockedPingDatabase = jest.mocked(pingDatabase);

describe('MongooseHealthRepository', () => {
  beforeEach(() => {
    mockedGetDatabaseState.mockReturnValue('disconnected');
    mockedIsDatabaseReady.mockReturnValue(false);
    mockedPingDatabase.mockResolvedValue(false);
  });

  it('does not ping when the connection state is unavailable', async () => {
    const repository = new MongooseHealthRepository();

    await expect(repository.getDatabaseStatus()).resolves.toEqual({
      ready: false,
      state: 'disconnected',
    });
    expect(mockedPingDatabase).not.toHaveBeenCalled();
  });

  it('requires a successful ping for readiness', async () => {
    mockedGetDatabaseState.mockReturnValue('connected');
    mockedIsDatabaseReady.mockReturnValue(true);
    mockedPingDatabase.mockResolvedValue(true);
    const repository = new MongooseHealthRepository();

    await expect(repository.getDatabaseStatus()).resolves.toEqual({
      ready: true,
      state: 'connected',
    });
    expect(mockedPingDatabase).toHaveBeenCalledTimes(1);
  });

  it('caches the short-lived readiness result', async () => {
    mockedGetDatabaseState.mockReturnValue('connected');
    mockedIsDatabaseReady.mockReturnValue(true);
    mockedPingDatabase.mockResolvedValue(true);
    const repository = new MongooseHealthRepository();

    await repository.getDatabaseStatus();
    mockedPingDatabase.mockResolvedValue(false);

    await expect(repository.getDatabaseStatus()).resolves.toEqual({
      ready: true,
      state: 'connected',
    });
    expect(mockedPingDatabase).toHaveBeenCalledTimes(1);
  });
});
