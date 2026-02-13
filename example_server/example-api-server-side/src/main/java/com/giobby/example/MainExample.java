package com.giobby.example;

import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpGet;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import org.apache.http.HttpEntity;
import org.apache.http.NameValuePair;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.conn.ssl.NoopHostnameVerifier;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.util.EntityUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import org.keycloak.OAuth2Constants;
import org.keycloak.representations.AccessTokenResponse;
import org.keycloak.util.JsonSerialization;

/**
 * @author gianlucat
 */
public class MainExample {

    private static AccessTokenResponse accessTokenResponse;

    private static final String URL_TOKEN_LOGIN = "https://authdev.giobby.com/auth/realms/api-server/protocol/openid-connect/token";
    private static final String URL_ENDPOINT = "https://dev.giobby.com/GiobbyApiLogin/v1";

    private static final String CID = "esempio-srl";
    private static final String USERNAME = "Mario";
    private static final String PASSWORD = "esempio_esempio";
    private static final String CLIENT_ID = "ZFL543LD1A-esempio-srl";

    private static final String REALM = "api-server";


    private static String endpoint;

    public static void main(String[] args) throws Exception {
        getToken();
        getEndpoint(CID);
        getContacts();
        getProducts();
    }

    private static CloseableHttpClient getClient() throws KeyManagementException, NoSuchAlgorithmException {
        TrustManager[] trustAllCerts = new TrustManager[]{
            new X509TrustManager() {
                public java.security.cert.X509Certificate[] getAcceptedIssuers() {
                    return null;
                }

                public void checkClientTrusted(X509Certificate[] certs, String authType) {
                }

                public void checkServerTrusted(X509Certificate[] certs, String authType) {
                }
            }
        };

        SSLContext sc = SSLContext.getInstance("SSL");

        sc.init(null, trustAllCerts, new SecureRandom());
        return HttpClients
                .custom()
                .setSSLHostnameVerifier(NoopHostnameVerifier.INSTANCE)
                .setSslcontext(sc)
                .build();

    }

    public static void getToken() throws IOException, NoSuchAlgorithmException, KeyManagementException {
        CloseableHttpClient client = getClient();

        try {
            HttpPost post = new HttpPost(URL_TOKEN_LOGIN);
            List<NameValuePair> formparams = new ArrayList<NameValuePair>();

            formparams.add(new BasicNameValuePair("username", USERNAME));
            formparams.add(new BasicNameValuePair("cid", CID));
            formparams.add(new BasicNameValuePair("password", PASSWORD));
            formparams.add(new BasicNameValuePair(OAuth2Constants.GRANT_TYPE, "password"));
            formparams.add(new BasicNameValuePair(OAuth2Constants.CLIENT_ID, CLIENT_ID));

            UrlEncodedFormEntity form = new UrlEncodedFormEntity(formparams, "UTF-8");

            post.setEntity(form);

            HttpResponse response = client.execute(post);
            int status = response.getStatusLine().getStatusCode();
            HttpEntity entity = response.getEntity();

            if (status != 200) {
                String json = getContent(entity);
                throw new IOException("Bad status: " + status + " response: " + json);
            }
            if (entity == null) {
                throw new IOException("No Entity");
            }
            String json = getContent(entity);
            System.out.println("json = " + json.replace(",", ",\n"));
            accessTokenResponse = JsonSerialization.readValue(json, AccessTokenResponse.class);
        } finally {
            client.close();
        }
    }

    public static String getContent(HttpEntity entity) throws IOException {
        if (entity == null) {
            return null;
        }

        InputStream is = entity.getContent();

        try {
            ByteArrayOutputStream os = new ByteArrayOutputStream();
            int c;

            while ((c = is.read()) != -1) {
                os.write(c);
            }

            byte[] bytes = os.toByteArray();
            String data = new String(bytes);

            return data;
        } finally {
            try {
                is.close();
            } catch (IOException ignored) {

            }
        }

    }

    public static void getContacts() throws Exception {
        CloseableHttpClient client = getClient();

        String contacts_endpoint = endpoint + "/contacts";

        HttpGet get = new HttpGet(contacts_endpoint);
        get.setHeader("Accept", "application/json");
        get.setHeader("Authorization", "Bearer " + accessTokenResponse.getToken());
        get.setHeader("X-Giobby-Realm", REALM);

        HttpResponse response = client.execute(get);

        if (response.getStatusLine().getStatusCode() == 200) {
            HttpEntity entity = response.getEntity();

            String result = EntityUtils.toString(entity);
            JSONObject json = new JSONObject(result);

            JSONArray contacts = json.getJSONArray("contacts");
            System.out.println("-----------------\nLista contatti : ");
            for (int i = 0; i < contacts.length(); i++) {
                System.out.println(contacts.getJSONObject(i).get("name"));
            }
        } else {
            System.out.println(response.getStatusLine().toString());
        }
        client.close();
    }

    public static void getProducts() throws Exception {
        CloseableHttpClient client = getClient();

        String products_endpoint = endpoint + "/products";

        HttpGet get = new HttpGet(products_endpoint);
        get.setHeader("Accept", "application/json");
        get.setHeader("Authorization", "Bearer " + accessTokenResponse.getToken());
        get.setHeader("X-Giobby-Realm", REALM);

        HttpResponse response = client.execute(get);

        if (response.getStatusLine().getStatusCode() == 200) {
            HttpEntity entity = response.getEntity();

            String result = EntityUtils.toString(entity);
            JSONObject json = new JSONObject(result);

            JSONArray contacts = json.getJSONArray("products");
            System.out.println("-----------------\nLista prodotti : ");
            for (int i = 0; i < contacts.length(); i++) {
                System.out.println(contacts.getJSONObject(i).get("description"));
            }
        } else {
            System.out.println(response.getStatusLine().toString());
        }
        client.close();
    }

    private static void getEndpoint(String cid) throws Exception {
        CloseableHttpClient client = getClient();

        endpoint = null;

        HttpGet get = new HttpGet(URL_ENDPOINT + "/endpoint?cid=" + cid);
        get.setHeader("Accept", "application/json");

        HttpResponse response = client.execute(get);

        if (response.getStatusLine().getStatusCode() == 200) {
            HttpEntity entity = response.getEntity();

            String result = EntityUtils.toString(entity);
            JSONObject json = new JSONObject(result);

            endpoint = json.getString("GiobbyApiURL");
        } else {
            System.out.println(response.getStatusLine().toString());
            System.err.println("Impossibile recuperare l'endpoint");
        }
        client.close();
    }

}
