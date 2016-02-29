# Local NodeJS proxy for Luminati.io network

You need active [Luminati.io](http://uminati.io/?cam=github) account to use this software.

### Configuration

Open `lum_local.js` in text editor and configure defaults:

* set `lum_customer` variable to your customer name
* set `lum_zones` variable to your zones and passwords
* add port ranges to `ports` array. For each range you can specify:
  * `from` - first port in this range
  * `count` - number of ports in this range
  * `opt` - default options for this range; only ‘zone’ is required, other fields (like ‘country’) are optional

### Usage

Start server with `node lum_local.js`

Now you can set it up as proxy for browser instances: just set `127.0.0.1:N` or `your-ip-address:N` as proxy address (where `N` belongs to port range you've configured).

You can test it locally with [curl](curl) (already installed if you use Linux or Mac):

```curl -v -x localhost:12000 http://lumtest.com/myip.json```

**Each port has it’s 'own' properties, and each browser instance can be configured to use it’s own proxy port**. 

You can change port properties with simple API on port 11000 (this port can be changed in `lum_local.js`, see `api_port`). Example:

* `http://localhost:11000/get?port=12000` (print current port configuration)
* `http://localhost:11000/set?port=12000&country=se` (change country)
* `http://localhost:11000/set?port=12000&session=abcdefgh` (change session)
* `http://localhost:11000/set?port=12000&superproxy=us&country=ca&....` (change superproxy country, exit node country and possibly other options)

Notice that this proxy doesn't require authentication from browser instances.

Tested with NodeJS version 4.3+. If you have technical question, please write to <vadim@hola.org>
