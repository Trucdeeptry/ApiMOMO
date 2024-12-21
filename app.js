require('dotenv').config();
const express = require("express");
const axios = require("axios");
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
const crypto = require("crypto");
app.use(express.urlencoded({ extended: true }));
var secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
var orderInfo = "pay with MoMo";
app.post("/payment", async (req, res) => {
    var accessKey = "F8BBA842ECF85";
    var partnerCode = "MOMO";
    var WebHost = process.env.WebHost
    var ApiHost = process.env.ApiHost
    var redirectUrl = `${WebHost}/order/dashboard`;
    var ipnUrl = `${ApiHost}/callback`;
    var requestType = "payWithMethod";
    var { amount } = req.body;
    var { orderId } = req.body;
    var requestId = orderId;
    var extraData = "";
    var orderGroupId = "";
    var autoCapture = true;
    var lang = "vi";

    //before sign HMAC SHA256 with format
    //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
    var rawSignature =
        "accessKey=" +
        accessKey +
        "&amount=" +
        amount +
        "&extraData=" +
        extraData +
        "&ipnUrl=" +
        ipnUrl +
        "&orderId=" +
        orderId +
        "&orderInfo=" +
        orderInfo +
        "&partnerCode=" +
        partnerCode +
        "&redirectUrl=" +
        redirectUrl +
        "&requestId=" +
        requestId +
        "&requestType=" +
        requestType;
    //puts raw signature
    console.log("--------------------RAW SIGNATURE----------------");
    console.log(rawSignature);
    //signature
    const crypto = require("crypto");
    var signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
    console.log("--------------------SIGNATURE----------------");
    console.log(signature);

    //json object send to MoMo endpoint
    const requestBody = JSON.stringify({
        partnerCode: partnerCode,
        partnerName: "Test",
        storeId: "MomoTestStore",
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: redirectUrl,
        ipnUrl: ipnUrl,
        lang: lang,
        requestType: requestType,
        autoCapture: autoCapture,
        extraData: extraData,
        orderGroupId: orderGroupId,
        signature: signature,
    });
    // options for axios
    const options = {
        method: "POST",
        url: "https://test-payment.momo.vn/v2/gateway/api/create",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(requestBody),
        },
        data: requestBody,
    };
    let result;
    try {
        result = await axios(options);
        return res.status(200).json(result.data);
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            message: "server error",
        });
    }
});
app.post("/callback", async (req, res) => {
    console.log("callback:");
    const result = req.body;
    console.log(result);
    //update order
    if (result.resultCode == 0) {
        console.log("thành công");
        try {
            const response = await fetch(
                `https://apimongodb-43mg.onrender.com/api/donhang/${result.orderId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        trang_thai: 'Đã thanh toán',
                    }),
                }
            );
            const data = await response.json();
            console.log('Order Updated:', data);
        } catch (error) {
            console.log('Lỗi khi update Order:', error);
        }
    }
    return res.status(200).json(req.body);
});
app.post("/transaction-status", async (req, res) => {
    const { orderId } = req.body;

    // const signature = accessKey=$accessKey&orderId=$orderId&partnerCode=$partnerCode
    // &requestId=$requestId
    var secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    var accessKey = "F8BBA842ECF85";
    const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=MOMO&requestId=${orderId}`;

    const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

    const requestBody = JSON.stringify({
        partnerCode: "MOMO",
        requestId: orderId,
        orderId: orderId,
        signature: signature,
        lang: "vi",
    });

    // options for axios
    const options = {
        method: "POST",
        url: "https://test-payment.momo.vn/v2/gateway/api/query",
        headers: {
            "Content-Type": "application/json",
        },
        data: requestBody,
    };

    const result = await axios(options);

    return res.status(200).json(result.data);
});
app.listen(5000, () => {
    console.log("server run at port 5000");
});
