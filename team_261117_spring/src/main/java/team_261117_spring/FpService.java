package team_261117_spring;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Flux;

@Service 
public class FpService {

    private final WebClient webClient = WebClient.create("http://localhost:8000");


    private void applyDuration(FpDto fpDto) {

        int hours = fpDto.getDuration_hours(); 
        int minutes = fpDto.getDuration_minutes();

        double duration = Math.round( (hours + (minutes / 60.0)) * 100.0) / 100.0;

        fpDto.setDuration(duration);

    }


    public PriceDto pricePred( FpDto fpDto ){

        applyDuration(fpDto);

        PriceDto pp = webClient.post()
                     .uri("/predict")
                     .contentType(MediaType.APPLICATION_JSON)
                     .bodyValue(fpDto)
                     .retrieve()
                     .bodyToMono(PriceDto.class)
                     .block();

        return pp;

    }

    public Flux<PriceDto> pricePredStream(FpDto fpDto) {

        applyDuration(fpDto);

        return webClient.post()
                .uri("/predict/stream")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(fpDto)
                .retrieve()
                .bodyToFlux(PriceDto.class);

    }


}



