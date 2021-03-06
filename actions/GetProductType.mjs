import messenger from "../services/messenger";
import textButton from "../replyTemplates/textButton";
import shopify from "../services/shopify";
import GetProductType from "./GetProductType";
import Welcome from "./Welcome";
import BOT_NAME from "../BOT_NAME";
import { getUserSettings, setUserSettings } from "../services/userData";
import NarrowProductType from "./NarrowProductType";

import products from "../services/products";
import _ from "lodash";

const actionName = "GetProductType";
const handler = async (recipientId, requestPayload) => {
  setUserSettings(recipientId, {
    productGender: requestPayload.productGender
  });

  if (requestPayload.productGender === "men") {
    messenger.callSendAPI({
      recipient: {
        id: recipientId
      },
      message: {
        text: `Sorry, CandyBoxx doesn't have anything for men. Maybe you'd like to buy something for your girlfriend?`,
        quick_replies: [
          textButton(`Great idea ${BOT_NAME}`, actionName, {
            productGender: "women"
          }),
          textButton("Go back", Welcome.actionName, {})
        ]
      }
    });
  } else {
    const productTypes = await products.getPopularProductTypes();
    const extractFirstLevel = type => type.split(" - ")[0];
    const categories = _.uniq(productTypes.map(extractFirstLevel));

    const messageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: `We can help with that. What kind of ${requestPayload.productGender}'s items?`,
        quick_replies: categories.map(category => {
          return textButton(category, NarrowProductType.actionName, {
            productTypePrefix: category
          });
        })
      }
    };

    messenger.callSendAPI(messageData);
  }
};

export default {
  actionName,
  handler
};
