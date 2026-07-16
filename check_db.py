import sqlite3
conn = sqlite3.connect('db/review.db')
conn.row_factory = sqlite3.Row
cursor = conn.execute('SELECT * FROM test_sessions')
for r in cursor.fetchall():
    print(dict(r))
conn.close()