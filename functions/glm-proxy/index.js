const catalyst = require('zcatalyst-sdk-node');

const GLM_URL =
  'https://api.catalyst.zoho.in/quickml/v1/project/17603000000084001/glm/chat';
const CATALYST_ORG = '60039712979';

module.exports = async (context, basicIO) => {
  // Only allow POST
  if (basicIO.getRequestMethod() !== 'POST') {
    basicIO.setStatusCode(405);
    basicIO.write(JSON.stringify({ error: 'Method not allowed' }));
    return context.close();
  }

  let body;
  try {
    body = JSON.parse(basicIO.getRequestBody());
  } catch {
    basicIO.setStatusCode(400);
    basicIO.write(JSON.stringify({ error: 'Invalid JSON body' }));
    return context.close();
  }

  // Get OAuth token from the Catalyst server-side SDK
  const app = catalyst.initialize(context);
  let token;
  try {
    token = await app.getOAuthToken('QuickML.deployment.READ');
  } catch (err) {
    basicIO.setStatusCode(500);
    basicIO.write(JSON.stringify({ error: 'Failed to get OAuth token: ' + err.message }));
    return context.close();
  }

  // Forward the request to the GLM API
  let glmRes;
  try {
    glmRes = await fetch(GLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Zoho-oauthtoken ${token}`,
        'CATALYST-ORG': CATALYST_ORG,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    basicIO.setStatusCode(502);
    basicIO.write(JSON.stringify({ error: 'GLM request failed: ' + err.message }));
    return context.close();
  }

  const glmBody = await glmRes.text();
  basicIO.setStatusCode(glmRes.status);
  basicIO.write(glmBody);
  context.close();
};
