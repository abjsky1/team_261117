package team_261117_spring;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Flux;

@RestController 
@RequiredArgsConstructor 
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class FpController {

    private final FpService fpService;

    @PostMapping("/pp")
    public PriceDto pricePred( @RequestBody FpDto fpDto ){

        return fpService.pricePred(fpDto);
    }

    @PostMapping(value = "/pp/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<PriceDto> pricePredStream(@RequestBody FpDto fpDto) {
        return fpService.pricePredStream(fpDto);
    }


}
