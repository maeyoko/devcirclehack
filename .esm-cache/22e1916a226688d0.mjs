let messenger;_226‍.w("../services/messenger",[["default",function(v){messenger=v}]]);let textButton;_226‍.w("../replyTemplates/textButton",[["default",function(v){textButton=v}]]);let shopify;_226‍.w("../services/shopify",[["default",function(v){shopify=v}]]);



const actionName = "GetProductCategories";
const handler = async (recipientId, requestPayload) => {
  console.log("searchin for data");
  const productCategories = await shopify.product.list({ limit: 10 });
  console.log("productCategories");
  console.log(productCategories);
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: `Feel free to search for anything you want or filter by categories`
      // quick_replies: [
      //   // textButton("Checkout our products!"),
      //   textButton("Get 3 products", "QR_GET_PRODUCT_LIST", {}),
      //   textButton("Tell me a joke", TellJokeActionName.actionName, {})
      // ]
    }
  };

  messenger.callSendAPI(messageData);
};

_226‍.d({
  actionName,
  handler
});
