let messenger;_6d3‍.w("../../services/messenger",[["default",function(v){messenger=v}]]);let textButton;_6d3‍.w("../../replyTemplates/textButton",[["default",function(v){textButton=v}]]);let BraSizing;_6d3‍.w("./BraSizing",[["default",function(v){BraSizing=v}]]);let HowToMeasure;_6d3‍.w("./HowToMeasure",[["default",function(v){HowToMeasure=v}]]);let LingerieSizing;_6d3‍.w("./LingerieSizing",[["default",function(v){LingerieSizing=v}]]);let Panties;_6d3‍.w("./Panties",[["default",function(v){Panties=v}]]);let Welcome;_6d3‍.w("../Welcome",[["default",function(v){Welcome=v}]]);









const actionName = "SIZING_MENU";
const handler = (recipientId, requestPayload) => {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: `We'd love to help you find the right size for you!`,
      quick_replies: [
        textButton("How to Measure", HowToMeasure.actionName, {}),
        textButton("Bra Sizing", BraSizing.actionName, {}),
        textButton("Lingerie Sizing", LingerieSizing.actionName, {}),
        textButton("Panties", Panties.actionName, {})
        // urlButton("Learn more!", "https://candyboxx.com/pages/sizing", {}),
        // urlButton("Go Back", Welcome.actionName, {})
      ]
    }
  };
  messenger.callSendAPI(messageData);
};

_6d3‍.d({
  actionName,
  handler
});
