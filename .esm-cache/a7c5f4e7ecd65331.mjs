let bodyParser;_ecd‍.w("body-parser",[["default",function(v){bodyParser=v}]]);let config;_ecd‍.w("config",[["default",function(v){config=v}]]);let crypto;_ecd‍.w("crypto",[["default",function(v){crypto=v}]]);let express;_ecd‍.w("express",[["default",function(v){express=v}]]);let https;_ecd‍.w("https",[["default",function(v){https=v}]]);let request;_ecd‍.w("request",[["default",function(v){request=v}]]);let shopify;_ecd‍.w("./services/shopify",[["default",function(v){shopify=v}]]);let messenger;_ecd‍.w("./services/messenger",[["default",function(v){messenger=v}]]);let WelcomeAction;_ecd‍.w("./actions/Welcome",[["default",function(v){WelcomeAction=v}]]);let registeredActions;_ecd‍.w("./actions",[["default",function(v){registeredActions=v}]]);let wit;_ecd‍.w("./services/wit",[["default",function(v){wit=v}]]);/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */















const callSendAPI = messenger.callSendAPI;
const callSendProfile = messenger.callSendProfile;

var app = express();
app.set("port", process.env.PORT || 5000);
app.set("view engine", "ejs");
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static("public"));

/*
 * Open config/default.json and set your config values before running this code. 
 * You can also set them using environment variables.
 *
 */

// App Secret can be retrieved from the App Dashboard
const FB_APP_SECRET = process.env.FB_APP_SECRET
  ? process.env.FB_APP_SECRET
  : config.get("fb_appSecret");

// Arbitrary value used to validate a webhook
const FB_VALIDATION_TOKEN = process.env.FB_VALIDATION_TOKEN
  ? process.env.FB_VALIDATION_TOKEN
  : config.get("fb_validationToken");

// Generate a page access token for your page from the App Dashboard
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN
  ? process.env.FB_PAGE_ACCESS_TOKEN
  : config.get("fb_pageAccessToken");

const HOST_URL = process.env.HOST_URL
  ? process.env.HOST_URL
  : config.get("host_url");

// make sure that everything has been properly configured
if (
  !(FB_APP_SECRET && FB_VALIDATION_TOKEN && FB_PAGE_ACCESS_TOKEN && HOST_URL)
) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * your App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // In DEV, log an error. In PROD, throw an error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split("=");
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto
      .createHmac("sha1", FB_APP_SECRET)
      .update(buf)
      .digest("hex");

    //console.log("signatureHash: " + signatureHash);
    //console.log("expectedHash: " + expectedHash);

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get("/webhook", function(req, res) {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === FB_VALIDATION_TOKEN
  ) {
    console.log("[app.get] Validating webhook");
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

/**
 * serves a static page for the webview
 */

app.get("/product_description", function(req, res) {
  var product_id = req.query["id"];
  if (product_id !== "null") {
    console.log("[app.get] product id:" + product_id);
    var sh_product = shopify.product.get(product_id);
    sh_product.then(
      function(product) {
        console.log(product.options[0].values);
        res.status(200).send(product.body_html);
      },
      function(error) {
        console.error("Error retrieving product");
        res.sendStatus(400).send("Error retrieving product");
      }
    );
  } else {
    console.error("Product id is required");
    res.sendStatus(400).send("Product id is required");
  }
});

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post("/webhook", function(req, res) {
  // You must send back a status 200 to let the Messenger Platform know that you've
  // received the callback. Do that right away because the countdown doesn't stop when
  // you're paused on a breakpoint! Otherwise, the request might time out.
  res.sendStatus(200);

  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == "page") {
    // entries may be batched so iterate over each one
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        let propertyNames = [];
        for (var prop in messagingEvent) {
          propertyNames.push(prop);
        }
        console.log(
          "[app.post] Webhook received a messagingEvent with properties: ",
          propertyNames.join()
        );

        if (messagingEvent.message) {
          // someone sent a message
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          // messenger platform sent a delivery confirmation
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          // user replied by tapping one of our postback buttons
          receivedPostback(messagingEvent);
        } else {
          console.log(
            "[app.post] Webhook is not prepared to handle this message."
          );
        }
      });
    });
  }
});

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 * 
 */
async function receivedMessage(event) {
  var senderID = event.sender.id;
  var pageID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log(
    "[receivedMessage] user (%d) page (%d) timestamp (%d) and message (%s)",
    senderID,
    pageID,
    timeOfMessage,
    JSON.stringify(message)
  );

  if (message.quick_reply) {
    console.log(
      "[receivedMessage] quick_reply.payload (%s)",
      message.quick_reply.payload
    );
    handleQuickReplyResponse(event);
    return;
  }

  var messageText = message.text;
  if (messageText) {
    var lcm = messageText.toLowerCase();
    switch (lcm) {
      // if the text matches any special keywords, handle them accordingly
      case "help":
        sendHelpOptionsAsButtonTemplates(senderID);
        break;

      default:
        // otherwise, just echo it back to the sender
        try {
          const response = await wit.message(messageText, {});
          console.log(response.entities);
        } catch (err) {
          console.log(err);
        }
        sendTextMessage(senderID, messageText);
    }
  }
}

/*
 * Send a message with buttons.
 *
 */
function sendHelpOptionsAsButtonTemplates(recipientId) {
  console.log(
    "[sendHelpOptionsAsButtonTemplates] Sending the help options menu"
  );
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Click the button before to get a list of 3 of our products.",
          buttons: [
            {
              type: "postback",
              title: "Get 3 products",
              payload: JSON.stringify({
                action: "QR_GET_PRODUCT_LIST",
                limit: 3
              })
            }
            // limit of three buttons
          ]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*
 * Someone tapped one of the Quick Reply buttons so 
 * respond with the appropriate content
 *
 */
function handleQuickReplyResponse(event) {
  var senderID = event.sender.id;
  var pageID = event.recipient.id;
  var message = event.message;
  var quickReplyPayload = message.quick_reply.payload;

  console.log(
    "[handleQuickReplyResponse] Handling quick reply response (%s) from sender (%d) to page (%d) with message (%s)",
    quickReplyPayload,
    senderID,
    pageID,
    JSON.stringify(message)
  );

  // use branched conversation with one interaction per feature (each of which contains a variable number of content pieces)
  respondToHelpRequestWithTemplates(senderID, quickReplyPayload);
}

/*
 * This response uses templateElements to present the user with a carousel
 * You send ALL of the content for the selected feature and they can 
 * swipe from side to side to see it
 *
 */
async function respondToHelpRequestWithTemplates(
  recipientId,
  requestForHelpOnFeature
) {
  console.log(
    "[respondToHelpRequestWithTemplates] handling help request for %s",
    requestForHelpOnFeature
  );
  var templateElements = [];

  var requestPayload = JSON.parse(requestForHelpOnFeature);

  var sectionButton = function(title, action, options) {
    var payload = options | {};
    payload = Object.assign(options, { action: action });
    return {
      type: "postback",
      title: title,
      payload: JSON.stringify(payload)
    };
  };

  var textButton = function(title, action, options) {
    var payload = options | {};
    payload = Object.assign(options, { action: action });
    return {
      content_type: "text",
      title: title,
      payload: JSON.stringify(payload)
    };
  };

  switch (requestPayload.action) {
    case "QR_GET_PRODUCT_LIST":
      var products = shopify.product.list({ limit: requestPayload.limit });
      products.then(function(listOfProducs) {
        listOfProducs.forEach(function(product) {
          var url = HOST_URL + "/product.html?id=" + product.id;
          templateElements.push({
            title: product.title,
            subtitle: product.tags,
            image_url: product.image.src,
            buttons: [
              {
                type: "web_url",
                url: url,
                title: "Read description",
                webview_height_ratio: "compact",
                messenger_extensions: "true"
              },
              sectionButton("Get options", "QR_GET_PRODUCT_OPTIONS", {
                id: product.id
              })
            ]
          });
        });

        var messageData = {
          recipient: {
            id: recipientId
          },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                elements: templateElements
              }
            }
          }
        };

        callSendAPI(messageData);
      });

      break;

    case "QR_GET_PRODUCT_OPTIONS":
      const product = await shopify.product.get(requestPayload.id);

      let options = "";
      product.options.map(function(option) {
        options = options + option.name + ": " + option.values.join(",") + "\n";
      });

      const messageData = {
        recipient: {
          id: recipientId
        },
        message: {
          text: options.substring(0, 640),
          quick_replies: [
            textButton("Get 3 products", "QR_GET_PRODUCT_LIST", { limit: 3 })
          ]
        }
      };
      callSendAPI(messageData);

      break;
    default:
      const validActions = new Set(Object.keys(registeredActions));

      if (validActions.has(requestPayload.action)) {
        const handler = registeredActions[requestPayload.action];

        handler(recipientId, requestPayload);
      } else {
        console.log(`Unregistered action: ${requestPayload.action}`);
      }
  }
}

/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id; // the user who sent the message
  var recipientID = event.recipient.id; // the page they sent it from
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log(
        "[receivedDeliveryConfirmation] Message with ID %s was delivered",
        messageID
      );
    });
  }

  console.log(
    "[receivedDeliveryConfirmation] All messages before timestamp %d were delivered.",
    watermark
  );
}

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;

  console.log(
    "[receivedPostback] from user (%d) on page (%d) with payload ('%s') " +
      "at (%d)",
    senderID,
    recipientID,
    payload,
    timeOfPostback
  );

  respondToHelpRequestWithTemplates(senderID, payload);
}

/*
 * Send a text message using the Send API.
 *
 */
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText, // utf-8, 640-character max
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

/*
 * Start server
 * Webhooks must be available via SSL with a certificate signed by a valid 
 * certificate authority.
 */
app.listen(app.get("port"), function() {
  console.log("[app.listen] Node app is running on port", app.get("port"));
  callSendProfile();
});

_ecd‍.d(app);
