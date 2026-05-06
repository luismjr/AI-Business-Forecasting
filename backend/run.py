"""
WSGI entrypoint for local development.

Run from the ``backend`` directory::

    python run.py

Default port is 5001 so macOS AirPlay Receiver (often bound to 5000) does not
intercept API requests and return unrelated responses (e.g. 403).
"""

import os

# Local imports
from app import create_app

# Application object usable by ``flask run`` or production servers.
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    # Development-only reloader and debugger.
    app.run(debug=True, port=port)
