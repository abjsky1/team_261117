package team_261117_spring;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service 
public class FpService {

    private final WebClient webClient = WebClient.create("http://localhost:8000");

    public PriceDto pricePred( FpDto fpDto ){

        PriceDto pp = webClient.post()
                     .uri("/pricepred")
                     .contentType(MediaType.APPLICATION_JSON)
                     .bodyValue(fpDto)
                     .retrieve()
                     .bodyToMono(PriceDto.class)
                     .block();

        return pp;
    }



}
